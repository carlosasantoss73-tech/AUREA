import { describe, expect, it, vi } from "vitest";
import { ContextRetrievalGate, type ContextProvider } from "../context/context-retrieval-gate.js";
import type { ExecutionAdapter } from "../execution-runtime.js";
import type { EcpStoredExpedient } from "./expedient-store.js";
import { executeEcpExpedientAnalysis } from "./expedient-analysis-runtime.js";

const record: EcpStoredExpedient = {
  clientId: "subject-a",
  expedientId: "exp-001",
  createdAt: "2026-10-10T00:00:00.000Z",
  intake: {
    projectId: "ecp",
    metadata: { procedureCode: "PROC-001", contractingEntity: "Entidad de prueba", objectDescription: "Servicio de mantenimiento", sourceUrl: "uploaded://local-expedient" },
    readiness: "READY_FOR_EVIDENCE_REVIEW",
    blockers: [],
    warnings: [],
    offerors: ["Proveedor A"],
    totalChunks: 1,
    documents: [{
      role: "OFFER",
      offeror: "Proveedor A",
      ingestion: {
        projectId: "ecp",
        documentId: "offer-a",
        title: "oferta-a.pdf",
        sourceUri: "uploaded://offer-a",
        mediaType: "application/pdf",
        sourceSha256: "a".repeat(64),
        sourceVersion: "sha256:" + "a".repeat(64),
        sourceBytes: 10,
        sourceUnits: 1,
        extractedUnits: 1,
        warnings: [],
        chunks: [{
          chunkId: "chunk-1",
          projectId: "ecp",
          documentId: "offer-a",
          title: "oferta-a.pdf",
          version: "sha256:" + "a".repeat(64),
          sourceUri: "uploaded://offer-a",
          mediaType: "application/pdf",
          locatorKind: "PAGE",
          locator: "1",
          chunkIndex: 0,
          chunkCount: 1,
          text: "La oferta declara cuatro vehículos.",
          textLength: 35,
          integrity: "COMPLETE_BLOCKS",
        }],
      },
    }],
  },
};

const principal = { clientId: "subject-a", actorId: "access-subject-a", actorRole: "ANALYST" };

function institutionalProvider(): ContextProvider {
  return {
    async retrieve(input) {
      return {
        projectId: input.projectId,
        query: input.query,
        facts: ["El requisito exige cuatro vehículos."],
        citations: [{
          sourceId: "institutional-source-1",
          documentId: "akl-046",
          version: "v1",
          title: "Contexto institucional ECP",
          excerpt: "La matriz exige comparar la capacidad declarada con evidencia primaria.",
          provenance: "INSTITUTIONAL",
        }],
      };
    },
  };
}

describe("executeEcpExpedientAnalysis", () => {
  it("blocks before provider invocation when approved institutional context is absent", async () => {
    const providerAdapter: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "test-provider",
      execute: vi.fn(async () => ({ output: "must not execute", evidence: ["PROVIDER_CALLED"] })),
    };
    const contextGate = new ContextRetrievalGate({
      async retrieve(input) { return { projectId: input.projectId, query: input.query, facts: [], citations: [] }; },
    });

    const result = await executeEcpExpedientAnalysis(record, principal, {
      providerAdapter,
      modelId: "test-model",
      contextGate,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.error).toContain("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(providerAdapter.execute).not.toHaveBeenCalled();
  });

  it("executes through RuntimeAdmission and the registered ECP adapter when institutional evidence is ready", async () => {
    const providerAdapter: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "test-provider",
      execute: vi.fn(async () => ({ output: "Matriz de evidencia preliminar.", evidence: ["PROVIDER_CALLED", "TRACE:provider"] })),
    };
    const result = await executeEcpExpedientAnalysis(record, principal, {
      providerAdapter,
      modelId: "test-model",
      contextGate: new ContextRetrievalGate(institutionalProvider()),
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.output).toBe("Matriz de evidencia preliminar.");
    expect(providerAdapter.execute).toHaveBeenCalledOnce();
    const input = providerAdapter.execute.mock.calls[0][0].input as { message: string };
    expect(input.message).toContain("La oferta declara cuatro vehículos.");
    expect(input.message).toContain("sha256:" + "a".repeat(64));
    expect(result.evidence.some((item) => item.startsWith("ECP_CONTEXT_SOURCE:akl-046:v1"))).toBe(true);
  });

  it("blocks oversized evidence instead of silently truncating it", async () => {
    const providerAdapter: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "test-provider",
      execute: vi.fn(async () => ({ output: "must not execute", evidence: ["PROVIDER_CALLED"] })),
    };
    const oversized = {
      ...record,
      intake: {
        ...record.intake,
        documents: record.intake.documents.map((document) => ({
          ...document,
          ingestion: {
            ...document.ingestion,
            chunks: [{ ...document.ingestion.chunks[0], text: "x".repeat(121_000) }],
          },
        })),
      },
    } as EcpStoredExpedient;
    const result = await executeEcpExpedientAnalysis(oversized, principal, {
      providerAdapter,
      modelId: "test-model",
      contextGate: new ContextRetrievalGate(institutionalProvider()),
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.error).toBe("ECP_ANALYSIS_EVIDENCE_TOO_LARGE_SPLIT_REQUIRED");
    expect(providerAdapter.execute).not.toHaveBeenCalled();
  });
});
