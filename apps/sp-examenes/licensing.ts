export interface SpExamSqlCursor {
  toArray<T>(): T[];
}

export interface SpExamSqlStorage {
  exec(sql: string, ...bindings: unknown[]): SpExamSqlCursor;
}

export interface SpExamLicenseDurableObjectState {
  storage: {
    sql: SpExamSqlStorage;
    transactionSync<T>(closure: () => T): T;
  };
}

type LicenseStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Private, SP EXÁMENES-only license authority.
 * One named Durable Object serializes license/session mutations; it must not
 * share a namespace or binding with Conchita or ECP.
 */
export class SpExamenesLicenseDurableObject {
  constructor(private readonly state: SpExamLicenseDurableObjectState) {
    const sql = this.state.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS sp_exam_licenses (
      code_hash TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('PENDING','ACTIVE','EXPIRED','REVOKED')),
      created_at INTEGER NOT NULL,
      activated_at INTEGER,
      expires_at INTEGER
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS sp_exam_sessions (
      session_hash TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      FOREIGN KEY(code_hash) REFERENCES sp_exam_licenses(code_hash)
    )`);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ status: "BLOCKED", reason: "METHOD_NOT_ALLOWED" }, 405);
    let body: {
      operation?: string;
      codeHash?: string;
      sessionHash?: string;
      now?: number;
      expiresAt?: number;
    };
    try {
      body = await request.json() as typeof body;
    } catch {
      return json({ status: "BLOCKED", reason: "INVALID_REQUEST" }, 400);
    }

    const sql = this.state.storage.sql;
    try {
      switch (body.operation) {
        case "create": {
          if (!body.codeHash || !Number.isSafeInteger(body.now)) return json({ status: "BLOCKED", reason: "INVALID_REQUEST" }, 400);
          sql.exec(
            "INSERT INTO sp_exam_licenses (code_hash, status, created_at, activated_at, expires_at) VALUES (?, 'PENDING', ?, NULL, NULL)",
            body.codeHash, body.now
          );
          return json({ status: "CREATED" }, 201);
        }
        case "activate": {
          if (!body.codeHash || !body.sessionHash || typeof body.now !== "number" || !Number.isSafeInteger(body.now)) return json({ status: "BLOCKED", reason: "INVALID_REQUEST" }, 400);
          const now = body.now;
          const activation = this.state.storage.transactionSync(() => {
            const rows = sql.exec(
              "SELECT code_hash, status, expires_at FROM sp_exam_licenses WHERE code_hash = ?",
              body.codeHash
            ).toArray<{ code_hash: string; status: LicenseStatus; expires_at: number | null }>();
            const license = rows[0];
            if (!license || license.status !== "PENDING") return null;
            const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
            sql.exec(
              "UPDATE sp_exam_licenses SET status = 'ACTIVE', activated_at = ?, expires_at = ? WHERE code_hash = ? AND status = 'PENDING'",
              now, expiresAt, body.codeHash
            );
            sql.exec(
              "INSERT INTO sp_exam_sessions (session_hash, code_hash, expires_at, revoked_at) VALUES (?, ?, ?, NULL)",
              body.sessionHash, body.codeHash, expiresAt
            );
            return expiresAt;
          });
          if (activation === null) return json({ status: "BLOCKED", reason: "INVALID_LICENSE" }, 409);
          return json({ status: "ACTIVATED", expiresAt: activation });
        }
        case "validate": {
          if (!body.sessionHash || !Number.isSafeInteger(body.now)) return json({ status: "BLOCKED", reason: "INVALID_REQUEST" }, 400);
          const rows = sql.exec(
            "SELECT l.status AS license_status, l.expires_at, s.expires_at AS session_expires_at, s.revoked_at FROM sp_exam_sessions s JOIN sp_exam_licenses l ON l.code_hash = s.code_hash WHERE s.session_hash = ?",
            body.sessionHash
          ).toArray<{ license_status: LicenseStatus; expires_at: number | null; session_expires_at: number; revoked_at: number | null }>();
          const session = rows[0];
          if (!session || session.revoked_at !== null || session.license_status !== "ACTIVE" ||
              session.expires_at === null || body.now >= session.expires_at ||
              body.now >= session.session_expires_at) {
            return json({ status: "BLOCKED", reason: "ACCESS_DENIED" }, 403);
          }
          return json({ status: "AUTHORIZED", expiresAt: session.expires_at });
        }
        case "revoke": {
          if (!body.codeHash || !Number.isSafeInteger(body.now)) return json({ status: "BLOCKED", reason: "INVALID_REQUEST" }, 400);
          const result = sql.exec(
            "UPDATE sp_exam_licenses SET status = 'REVOKED' WHERE code_hash = ? AND status IN ('PENDING','ACTIVE')",
            body.codeHash
          );
          sql.exec(
            "UPDATE sp_exam_sessions SET revoked_at = ? WHERE code_hash = ? AND revoked_at IS NULL",
            body.now, body.codeHash
          );
          return json({ status: "REVOKED" });
        }
        default:
          return json({ status: "BLOCKED", reason: "OPERATION_NOT_SUPPORTED" }, 400);
      }
    } catch {
      // Fail closed: storage errors never authorize a request.
      return json({ status: "BLOCKED", reason: "LICENSE_STORAGE_FAILURE" }, 503);
    }
  }
}
