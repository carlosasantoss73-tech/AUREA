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

/** Durable Object is isolated by authenticated subject-derived namespace. */
export class EcpExpedientStateDurableObject {
  constructor(private readonly state: DurableObjectStateLike) {}

  async save(record: EcpStoredExpedient): Promise<void> {
    if (!record.clientId.trim() || !record.expedientId.trim()) throw new Error("ECP_STORE_ID_REQUIRED");
    await this.state.storage.put<EcpStoredExpedient>(`expedient:${record.expedientId}`, record);
  }

  async get(expedientId: string): Promise<EcpStoredExpedient | null> {
    if (!expedientId.trim()) return null;
    return (await this.state.storage.get<EcpStoredExpedient>(`expedient:${expedientId}`)) ?? null;
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
