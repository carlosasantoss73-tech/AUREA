import { describe, expect, it } from "vitest";
import {
  EcpDurableObjectExpedientStore,
  EcpExpedientStateDurableObject,
  type DurableObjectStorageLike,
  type EcpStoredExpedient,
} from "./expedient-store.js";

class MemoryStorage implements DurableObjectStorageLike {
  private values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  async put<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
}

const record: EcpStoredExpedient = {
  clientId: "subject-a",
  expedientId: "exp-1",
  createdAt: "2026-10-10T00:00:00.000Z",
  intake: {
    projectId: "ecp",
    metadata: { procedureCode: "P-1", contractingEntity: "Entidad", objectDescription: "Objeto", sourceUrl: "uploaded://local-expedient" },
    readiness: "BLOCKED",
    blockers: ["ECP_INTAKE_OFFER_DOCUMENT_REQUIRED"],
    warnings: [],
    documents: [],
    offerors: [],
    totalChunks: 0,
  },
};

describe("ECP Durable Object store", () => {
  it("persists and reads records through the Durable Object boundary", async () => {
    const state = new EcpExpedientStateDurableObject({ storage: new MemoryStorage() });
    const store = new EcpDurableObjectExpedientStore("subject-a", state);
    await store.save(record);
    await expect(store.get("subject-a", "exp-1")).resolves.toEqual(record);
  });

  it("does not permit cross-client writes or reads", async () => {
    const state = new EcpExpedientStateDurableObject({ storage: new MemoryStorage() });
    const store = new EcpDurableObjectExpedientStore("subject-a", state);
    await expect(store.save({ ...record, clientId: "subject-b" })).rejects.toThrow("ECP_STORE_CLIENT_SCOPE_MISMATCH");
    await expect(store.get("subject-b", "exp-1")).resolves.toBeNull();
  });

  it("does not return a record if the stored identity does not match the namespace", async () => {
    const state = new EcpExpedientStateDurableObject({ storage: new MemoryStorage() });
    await state.save({ ...record, clientId: "subject-b" });
    const store = new EcpDurableObjectExpedientStore("subject-a", state);
    await expect(store.get("subject-a", "exp-1")).resolves.toBeNull();
  });
});
