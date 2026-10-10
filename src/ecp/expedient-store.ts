import type { EcpExpedientIntakeResult } from "./expedient-intake.js";

export interface EcpStoredExpedient {
  clientId: string;
  expedientId: string;
  createdAt: string;
  intake: EcpExpedientIntakeResult;
}

export interface EcpExpedientStore {
  save(record: EcpStoredExpedient): Promise<void>;
  get(clientId: string, expedientId: string): Promise<EcpStoredExpedient | null>;
}

export interface EcpExpedientStateStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

interface ExpedientManifest {
  format: "json-chunks-v1";
  clientId: string;
  expedientId: string;
  createdAt: string;
  chunkCount: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// SQLite-backed Durable Objects cap each key + value at 2 MB. Keep fragments
// well below that limit, including UTF-8 expansion.
const MAX_CHUNK_CODE_UNITS = 150_000;

function splitJsonIntoChunks(serialized: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < serialized.length;) {
    let end = Math.min(start + MAX_CHUNK_CODE_UNITS, serialized.length);
    if (end < serialized.length) {
      const previous = serialized.charCodeAt(end - 1);
      if (previous >= 0xd800 && previous <= 0xdbff) end -= 1;
    }
    chunks.push(serialized.slice(start, end));
    start = end;
  }
  return chunks;
}

/** Durable Object is isolated by authenticated subject-derived namespace. */
export class EcpExpedientStateDurableObject {
  constructor(private readonly state: DurableObjectStateLike) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ status: "BLOCKED", error: "METHOD_NOT_ALLOWED" }, 405);
    try {
      const body = await request.json() as { operation?: unknown; record?: EcpStoredExpedient; expedientId?: unknown };
      if (body.operation === "save") {
        if (!body.record || typeof body.record !== "object") return json({ status: "BLOCKED", error: "RECORD_REQUIRED" }, 400);
        await this.save(body.record);
        return json({ status: "OK" });
      }
      if (body.operation === "get") {
        if (typeof body.expedientId !== "string") return json({ status: "BLOCKED", error: "EXPEDIENT_ID_REQUIRED" }, 400);
        return json({ status: "OK", record: await this.get(body.expedientId) });
      }
      return json({ status: "BLOCKED", error: "OPERATION_NOT_SUPPORTED" }, 400);
    } catch {
      return json({ status: "BLOCKED", error: "ECP_DURABLE_OBJECT_FAILURE" }, 503);
    }
  }

  private async save(record: EcpStoredExpedient): Promise<void> {
    if (!record.clientId?.trim() || !record.expedientId?.trim()) throw new Error("ECP_STORE_ID_REQUIRED");
    const serialized = JSON.stringify(record);
    const chunks = splitJsonIntoChunks(serialized);
    const prefix = `expedient:${record.expedientId}`;

    // Write payload first and publish manifest last; readers never observe a
    // new manifest until all fragments have been written.
    for (let index = 0; index < chunks.length; index += 1) {
      await this.state.storage.put<string>(`${prefix}:part:${index}`, chunks[index]);
    }
    const manifest: ExpedientManifest = {
      format: "json-chunks-v1",
      clientId: record.clientId,
      expedientId: record.expedientId,
      createdAt: record.createdAt,
      chunkCount: chunks.length,
    };
    await this.state.storage.put<ExpedientManifest>(prefix, manifest);
  }

  private async get(expedientId: string): Promise<EcpStoredExpedient | null> {
    if (!expedientId.trim()) return null;
    const prefix = `expedient:${expedientId}`;
    const manifest = await this.state.storage.get<ExpedientManifest>(prefix);
    if (!manifest || manifest.format !== "json-chunks-v1" || manifest.expedientId !== expedientId ||
        !Number.isSafeInteger(manifest.chunkCount) || manifest.chunkCount < 1) return null;

    const chunks: string[] = [];
    for (let index = 0; index < manifest.chunkCount; index += 1) {
      const chunk = await this.state.storage.get<string>(`${prefix}:part:${index}`);
      if (typeof chunk !== "string") return null;
      chunks.push(chunk);
    }
    try {
      const record = JSON.parse(chunks.join("")) as EcpStoredExpedient;
      if (record.clientId !== manifest.clientId || record.expedientId !== manifest.expedientId ||
          record.createdAt !== manifest.createdAt) return null;
      return record;
    } catch { return null; }
  }
}

export interface DurableObjectNamespaceBinding {
  idFromName(name: string): unknown;
  get(id: unknown): EcpExpedientStateStub;
}

/** RPC adapter for a real Cloudflare Durable Object stub (fetch-only boundary). */
export class EcpDurableObjectExpedientStore implements EcpExpedientStore {
  constructor(private readonly clientId: string, private readonly stub: EcpExpedientStateStub) {
    if (!clientId.trim()) throw new Error("ECP_STORE_CLIENT_REQUIRED");
  }

  async save(record: EcpStoredExpedient): Promise<void> {
    if (record.clientId !== this.clientId) throw new Error("ECP_STORE_CLIENT_SCOPE_MISMATCH");
    const response = await this.stub.fetch("https://ecp-expedient-state.internal/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "save", record }),
    });
    if (!response.ok) throw new Error(`ECP_STORE_DO_HTTP_${response.status}`);
    const body = await response.json() as { status?: string };
    if (body.status !== "OK") throw new Error("ECP_STORE_DO_REJECTED");
  }

  async get(clientId: string, expedientId: string): Promise<EcpStoredExpedient | null> {
    if (clientId !== this.clientId) return null;
    const response = await this.stub.fetch("https://ecp-expedient-state.internal/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "get", expedientId }),
    });
    if (!response.ok) throw new Error(`ECP_STORE_DO_HTTP_${response.status}`);
    const body = await response.json() as { status?: string; record?: EcpStoredExpedient | null };
    if (body.status !== "OK") throw new Error("ECP_STORE_DO_REJECTED");
    const record = body.record ?? null;
    if (!record || record.clientId !== this.clientId || record.expedientId !== expedientId) return null;
    return record;
  }
}
