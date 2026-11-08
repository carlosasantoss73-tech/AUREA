import { describe, expect, it } from "vitest";
import { SpExamenesLicenseDurableObject } from "./licensing.js";

type License = { code_hash: string; status: string; created_at: number; activated_at: number | null; expires_at: number | null };
type Session = { session_hash: string; code_hash: string; expires_at: number; revoked_at: number | null };

function createHarness() {
  const licenses = new Map<string, License>();
  const sessions = new Map<string, Session>();
  const sql = {
    exec(statement: string, ...values: unknown[]) {
      if (statement.startsWith("CREATE TABLE")) return { toArray: <T>() => [] as T[] };
      if (statement.startsWith("INSERT INTO sp_exam_licenses")) {
        const [hash, createdAt] = values as [string, number];
        if (licenses.has(hash)) throw new Error("UNIQUE_LICENSE");
        licenses.set(hash, { code_hash: hash, status: "PENDING", created_at: createdAt, activated_at: null, expires_at: null });
        return { toArray: <T>() => [] as T[] };
      }
      if (statement.startsWith("SELECT code_hash, status, expires_at FROM sp_exam_licenses")) {
        const row = licenses.get(String(values[0]));
        return { toArray: <T>() => (row ? [row] : []) as T[] };
      }
      if (statement.startsWith("UPDATE sp_exam_licenses SET status = 'ACTIVE'")) {
        const [activatedAt, expiresAt, hash] = values as [number, number, string];
        const row = licenses.get(hash);
        if (row?.status === "PENDING") Object.assign(row, { status: "ACTIVE", activated_at: activatedAt, expires_at: expiresAt });
        return { toArray: <T>() => [] as T[] };
      }
      if (statement.startsWith("INSERT INTO sp_exam_sessions")) {
        const [sessionHash, codeHash, expiresAt] = values as [string, string, number];
        if (sessions.has(sessionHash)) throw new Error("UNIQUE_SESSION");
        sessions.set(sessionHash, { session_hash: sessionHash, code_hash: codeHash, expires_at: expiresAt, revoked_at: null });
        return { toArray: <T>() => [] as T[] };
      }
      if (statement.startsWith("SELECT l.status AS license_status")) {
        const session = sessions.get(String(values[0]));
        const license = session ? licenses.get(session.code_hash) : undefined;
        const row = session && license ? [{
          license_status: license.status,
          expires_at: license.expires_at,
          session_expires_at: session.expires_at,
          revoked_at: session.revoked_at
        }] : [];
        return { toArray: <T>() => row as T[] };
      }
      if (statement.startsWith("UPDATE sp_exam_licenses SET status = 'REVOKED'")) {
        const row = licenses.get(String(values[0]));
        if (row && ["PENDING", "ACTIVE"].includes(row.status)) row.status = "REVOKED";
        return { toArray: <T>() => [] as T[] };
      }
      if (statement.startsWith("UPDATE sp_exam_sessions SET revoked_at")) {
        const [now, hash] = values as [number, string];
        for (const session of sessions.values()) if (session.code_hash === hash && session.revoked_at === null) session.revoked_at = now;
        return { toArray: <T>() => [] as T[] };
      }
      throw new Error("UNEXPECTED_SQL: " + statement);
    }
  };
  const object = new SpExamenesLicenseDurableObject({ storage: { sql } });
  const call = async (body: unknown) => object.fetch(new Request("https://license.internal/", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  }));
  return { call };
}

describe("SP EXÁMENES isolated license Durable Object", () => {
  it("creates a pending license and activates it for exactly 30 days", async () => {
    const { call } = createHarness();
    const now = 1_800_000_000_000;
    expect((await call({ operation: "create", codeHash: "hash-code", now })).status).toBe(201);
    const activation = await call({ operation: "activate", codeHash: "hash-code", sessionHash: "hash-session", now });
    expect(activation.status).toBe(200);
    await expect(activation.json()).resolves.toEqual({ status: "ACTIVATED", expiresAt: now + 30 * 24 * 60 * 60 * 1000 });
  });

  it("allows one activation only and rejects a second redemption", async () => {
    const { call } = createHarness();
    const now = 1_800_000_000_000;
    await call({ operation: "create", codeHash: "hash-code", now });
    const first = await call({ operation: "activate", codeHash: "hash-code", sessionHash: "session-one", now });
    const second = await call({ operation: "activate", codeHash: "hash-code", sessionHash: "session-two", now });
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it("authorizes a valid session and blocks at the exact expiration instant", async () => {
    const { call } = createHarness();
    const now = 1_800_000_000_000;
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    await call({ operation: "create", codeHash: "hash-code", now });
    await call({ operation: "activate", codeHash: "hash-code", sessionHash: "hash-session", now });
    const valid = await call({ operation: "validate", sessionHash: "hash-session", now: expiresAt - 1 });
    const expired = await call({ operation: "validate", sessionHash: "hash-session", now: expiresAt });
    expect(valid.status).toBe(200);
    expect(expired.status).toBe(403);
  });

  it("revokes a license and immediately blocks its session", async () => {
    const { call } = createHarness();
    const now = 1_800_000_000_000;
    await call({ operation: "create", codeHash: "hash-code", now });
    await call({ operation: "activate", codeHash: "hash-code", sessionHash: "hash-session", now });
    await call({ operation: "revoke", codeHash: "hash-code", now: now + 1 });
    const result = await call({ operation: "validate", sessionHash: "hash-session", now: now + 2 });
    expect(result.status).toBe(403);
  });

  it("fails closed when storage throws during validation", async () => {
    let initialized = 0;
    const sql = {
      exec(statement: string) {
        if (statement.startsWith("CREATE TABLE")) {
          initialized++;
          return { toArray: <T>() => [] as T[] };
        }
        throw new Error("disk unavailable");
      }
    };
    const object = new SpExamenesLicenseDurableObject({ storage: { sql } });
    const response = await object.fetch(new Request("https://license.internal/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "validate", sessionHash: "session", now: 1_800_000_000_000 })
    }));
    expect(initialized).toBe(2);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ status: "BLOCKED" });
  });

  it("allows exactly one winner when the same license is activated concurrently", async () => {
    const { call } = createHarness();
    const now = 1_800_000_000_000;
    await call({ operation: "create", codeHash: "hash-code", now });
    const attempts = await Promise.all([
      call({ operation: "activate", codeHash: "hash-code", sessionHash: "session-one", now }),
      call({ operation: "activate", codeHash: "hash-code", sessionHash: "session-two", now })
    ]);
    expect(attempts.filter(response => response.status === 200)).toHaveLength(1);
    expect(attempts.filter(response => response.status === 409)).toHaveLength(1);
  });
});
