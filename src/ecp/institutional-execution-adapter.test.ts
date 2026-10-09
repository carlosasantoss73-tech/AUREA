import { describe, expect, it, vi } from "vitest";
import type { ExecutionAdapter, ExecutionAdapterRequest } from "../execution-runtime.js";
import { ContextRetrievalGate, type ContextProvider } from "../context/context-retrieval-gate.js";
import { EcpInstitutionalExecutionAdapter } from "./institutional-execution-adapter.js";

const request: ExecutionAdapterRequest = {
  traceId: "ecp-runtime-trace-1",
  provider: {
    providerId: "test-provider",
    modelId: "test-model",
    status: "EXECUTABLE",
    capabilities: ["ecp.analyze"],
    healthEvidence: ["TEST_PROVIDER_READY"],
  },
  input: { message: "Evalúa el requisito de vehículos." },
};

function delegateFixture(): ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } {
  return {
    providerId: "test-provider",
    execute: vi.fn(async () => ({ output: "resultado de prueba", evidence: ["TEST_PROVIDER_CALL"] })),
  };
}

describe("ECP institutional execution adapter", () => {
  it("injects citation-preserving context before calling the provider", async () => {
    const provider: ContextProvider = {
      async retrieve(input) {
        expect(input.projectId).toBe("ecp");
        expect(input.traceId).toBeTruthy();
        return {
          projectId: "ecp",
          query: input.query,
          facts: ["El pliego exige cuatro vehículos 4x2."],
          citations: [{
            sourceId: "bib:doc-17",
            documentId: "doc-17",
            version: "v4",
            title: "Pliego del procedimiento",
            excerpt: "Cuatro vehículos 4x2",
            provenance: "INSTITUTIONAL",
          }],
        };
      },
    };
    const delegate = delegateFixture();
    const adapter = new EcpInstitutionalExecutionAdapter(
      delegate,
      new ContextRetrievalGate(provider),
      { actorId: "test-actor", actorRole: "system" },
    );

    const result = await adapter.execute(request);
    expect(delegate.execute).toHaveBeenCalledOnce();
    const delegatedInput = delegate.execute.mock.calls[0][0].input as { message: string };
    expect(delegatedInput.message).toContain("ID DOCUMENTO: doc-17");
    expect(delegatedInput.message).toContain("FUENTE: Pliego del procedimiento");
    expect(delegatedInput.message).toContain("SOLICITUD DEL USUARIO:");
    expect(result.evidence).toContain("ECP_CONTEXT_PIPELINE:READY");
    expect(result.evidence).toContain("ECP_CONTEXT_SOURCE:doc-17:v4");
  });

  it("never calls the provider when institutional context is missing", async () => {
    const provider: ContextProvider = {
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    };
    const delegate = delegateFixture();
    const adapter = new EcpInstitutionalExecutionAdapter(
      delegate,
      new ContextRetrievalGate(provider),
      { actorId: "test-actor", actorRole: "system" },
    );

    await expect(adapter.execute(request)).rejects.toThrow("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it("never calls the provider when citations are not institutional", async () => {
    const provider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["dato local"],
          citations: [{
            sourceId: "seed",
            documentId: "seed-1",
            version: 1,
            title: "Semilla local",
            excerpt: "dato local",
            provenance: "LOCAL_SEED",
          }],
        };
      },
    };
    const delegate = delegateFixture();
    const adapter = new EcpInstitutionalExecutionAdapter(
      delegate,
      new ContextRetrievalGate(provider),
      { actorId: "test-actor", actorRole: "system" },
    );

    await expect(adapter.execute(request)).rejects.toThrow("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});
