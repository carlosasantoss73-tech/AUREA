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
  save(record: EcpStoredExpedient): Promise<void>;
  get(expedientId: string): Promise<EcpStoredExpedient | null>;
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

// SQLite-backed Durable Objects cap each key + value at 2 MB. Keep individual
// JSON fragments well below that limit, including UTF-8 expansion.
const MAX_CHUNK_CODE_UNITS = 150_000;

function splitJsonIntoChunks(serialized: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < serialized.length;) {
    let end = Math.min(start + MAX_CHUNK_CODE_UNITS, serialized.length);
    // Do not split a UTF-16 surrogate pair across independently stored values.
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

  async save(record: EcpStoredExpedient): Promise<void> {
    if (!record.clientId.trim() || !record.expedientId.trim()) throw new Error("ECP_STORE_ID_REQUIRED");
    const serialized = JSON.stringify(record);
    const chunks = splitJsonIntoChunks(serialized);
    const prefix = `expedient:${record.expedientId}`;

    // Write the payload first and publish the manifest last. Readers will not
    // observe a newly saved record until every fragment has been written.
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

  async get(expedientId: string): Promise<EcpStoredExpedient | null> {
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
    } catch {
      return null;
    }
  }
}

export interface DurableObjectNamespaceBinding {
  idFromName(name: string): unknown;
  get(id: unknown): EcpExpedientStateStub;
}

export class EcpDurableObjectExpedientStore implements EcpExpedientStore {
  constructor(private readonly clientId: string, private readonly stub: EcpExpedientStateStub) {
    if (!clientId.trim()) throw new Error("ECP_STORE_CLIENT_REQUIRED");
  }

  async save(record: EcpStoredExpedient): Promise<void> {
    if (record.clientId !== this.clientId) throw new Error("ECP_STORE_CLIENT_SCOPE_MISMATCH");
    await this.stub.save(record);
  }

  async get(clientId: string, expedientId: string): Promise<EcpStoredExpedient | null> {
    if (clientId !== this.clientId) return null;
    const record = await this.stub.get(expedientId);
    if (!record || record.clientId !== this.clientId || record.expedientId !== expedientId) return null;
    return record;
  }
}
