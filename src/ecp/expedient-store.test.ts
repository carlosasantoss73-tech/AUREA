import { describe, expect, it } from "vitest";
import {
  EcpDurableObjectExpedientStore,
  EcpExpedientStateDurableObject,
  type DurableObjectStorageLike,
  type EcpExpedientStateStub,
  type EcpStoredExpedient,
} from "./expedient-store.js";

class MemoryStorage implements DurableObjectStorageLike {
  private values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return this.values.get(key) as T | undefined; }
  async put<T>(key: string, value: T): Promise<void> {
    if (typeof value === "string" && new TextEncoder().encode(value).byteLength > 512 * 1024) {
      throw new Error("SIMULATED_DURABLE_OBJECT_VALUE_LIMIT");
    }
    this.values.set(key, value);
  }
}

class LocalDurableObjectStub implements EcpExpedientStateStub {
  constructor(private readonly object: EcpExpedientStateDurableObject) {}
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.object.fetch(new Request(input, init));
  }
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

function makeStore(clientId = "subject-a") {
  const object = new EcpExpedientStateDurableObject({ storage: new MemoryStorage() });
  return { object, store: new EcpDurableObjectExpedientStore(clientId, new LocalDurableObjectStub(object)) };
}

describe("ECP Durable Object store", () => {
  it("persists and reads through the real fetch RPC boundary", async () => {
    const { store } = makeStore();
    await store.save(record);
    await expect(store.get("subject-a", "exp-1")).resolves.toEqual(record);
  });

  it("shards large UTF-8 expediente records below the per-value storage limit", async () => {
    const { store } = makeStore();
    const largeDescription = "á😀".repeat(350_000);
    const largeRecord: EcpStoredExpedient = {
      ...record,
      expedientId: "exp-large",
      intake: {
        ...record.intake,
        metadata: { ...record.intake.metadata, objectDescription: largeDescription },
      },
    };
    await store.save(largeRecord);
    const recovered = await store.get("subject-a", "exp-large");
    expect(recovered?.intake.metadata.objectDescription).toBe(largeDescription);
  });

  it("does not permit cross-client writes or reads", async () => {
    const { store } = makeStore();
    await expect(store.save({ ...record, clientId: "subject-b" })).rejects.toThrow("ECP_STORE_CLIENT_SCOPE_MISMATCH");
    await expect(store.get("subject-b", "exp-1")).resolves.toBeNull();
  });

  it("does not return a record if the stored identity does not match the namespace", async () => {
    const { object } = makeStore();
    const direct = new LocalDurableObjectStub(object);
    await direct.fetch("https://ecp-expedient-state.internal/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "save", record: { ...record, clientId: "subject-b" } }),
    });
    const store = new EcpDurableObjectExpedientStore("subject-a", direct);
    await expect(store.get("subject-a", "exp-1")).resolves.toBeNull();
  });
});
