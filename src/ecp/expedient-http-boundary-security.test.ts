import { describe, expect, it, vi } from "vitest";
import { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import type { EcpAuthenticatedPrincipal } from "./expedient-http-api.js";
import { createEcpExpedientHttpHandler } from "./expedient-http-api.js";
import type { EcpExpedientStore, EcpStoredExpedient } from "./expedient-store.js";

/**
 * Boundary contract tests with explicitly synthetic dependencies.
 * They validate fail-closed behavior and tenant isolation; they do not prove
 * institutional Google Drive access, real authentication, or deployment.
 */
class StoreFixture implements EcpExpedientStore {
  private readonly records = new Map<string, EcpStoredExpedient>();
  async save(record: EcpStoredExpedient): Promise<void> {
    this.records.set(`${record.clientId}:${record.expedientId}`, structuredClone(record));
  }
  async get(clientId: string, expedientId: string): Promise<EcpStoredExpedient | null> {
    const record = this.records.get(`${clientId}:${expedientId}`);
    return record ? structuredClone(record) : null;
  }
}

const principal: EcpAuthenticatedPrincipal = {
  clientId: "fixture-client-a",
  actorId: "fixture-actor-a",
  actorRole: "ANALYST",
};

function readyFixtureRecord(): EcpStoredExpedient {
  return {
    clientId: principal.clientId,
    expedientId: "fixture-expedient-001",
    createdAt: "2026-10-12T12:00:00.000Z",
    intake: {
      projectId: "ecp",
      metadata: {
        procedureCode: "ECP-FIXTURE-001",
        contractingEntity: "Entidad ficticia",
        objectDescription: "Objeto sintético de prueba",
        sourceUrl: "fixture://procedure/ECP-FIXTURE-001",
      },
      readiness: "READY_FOR_EVIDENCE_REVIEW",
      blockers: [],
      warnings: [],
      documents: [
        {
          role: "PROCEDURE",
          ingestion: {
            projectId: "ecp",
            documentId: "fixture-procedure-001",
            sourceUri: "fixture://procedure",
            sourceBytes: 1,
            title: "FIXTURE_pliego.pdf",
            mediaType: "application/pdf",
            sourceVersion: "sha256:fixture-procedure",
            sourceSha256: "fixture-procedure",
            sourceUnits: 1,
            extractedUnits: 1,
            warnings: [],
            chunks: [],
          },
        },
        {
          role: "OFFER",
          offeror: "Oferente ficticio A",
          ingestion: {
            projectId: "ecp",
            documentId: "fixture-offer-001",
            sourceUri: "fixture://offer",
            sourceBytes: 1,
            title: "FIXTURE_oferta.pdf",
            mediaType: "application/pdf",
            sourceVersion: "sha256:fixture-offer",
            sourceSha256: "fixture-offer",
            sourceUnits: 1,
            extractedUnits: 1,
            warnings: [],
            chunks: [],
          },
        },
      ],
      offerors: ["Oferente ficticio A"],
      totalChunks: 2,
    },
  };
}

function emptyGate() {
  return new ContextRetrievalGate({
    async retrieve(input) {
      return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
    },
  });
}

describe("ECP HTTP boundary — fail-closed contract", () => {
  it("returns 401 when authentication provides no principal", async () => {
    const store = new StoreFixture();
    const analyze = vi.fn(async () => ({
      status: "SUCCEEDED" as const,
      traceId: "should-not-run",
      evidence: [],
      output: "should not execute",
    }));
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => null,
      store,
      contextGate: emptyGate(),
      analyze,
    });

    const response = await handler(new Request("https://ecp.test/ecp/v1/expedients/fixture-expedient-001/analyze", {
      method: "POST",
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("does not disclose an expediente across client namespaces", async () => {
    const store = new StoreFixture();
    await store.save(readyFixtureRecord());
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => ({ ...principal, clientId: "fixture-client-b" }),
      store,
      contextGate: emptyGate(),
    });

    const response = await handler(new Request("https://ecp.test/ecp/v1/expedients/fixture-expedient-001"));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ status: "BLOCKED", error: "EXPEDIENT_NOT_FOUND" });
  });

  it("does not invoke analysis when the institutional context gate is empty", async () => {
    const store = new StoreFixture();
    await store.save(readyFixtureRecord());
    const analyze = vi.fn(async () => ({
      status: "SUCCEEDED" as const,
      traceId: "must-not-run",
      evidence: [],
      output: "must not be returned",
    }));
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => principal,
      store,
      contextGate: emptyGate(),
      analyze,
    });

    const response = await handler(new Request("https://ecp.test/ecp/v1/expedients/fixture-expedient-001/analysis-readiness", {
      method: "POST",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ status: "BLOCKED", error: "ECP_INSTITUTIONAL_CONTEXT_BLOCKED" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("blocks malformed request bodies before any expediente is created", async () => {
    const store = new StoreFixture();
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => principal,
      store,
      contextGate: emptyGate(),
    });

    const response = await handler(new Request("https://ecp.test/ecp/v1/expedients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: "BLOCKED", error: "INVALID_JSON" });
    expect(await store.get(principal.clientId, "fixture-expedient-001")).toBeNull();
  });
});
