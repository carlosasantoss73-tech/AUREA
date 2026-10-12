import { describe, expect, it, vi } from "vitest";
import { ContextRetrievalGate, type ContextProvider } from "../context/context-retrieval-gate.js";
import { ExecutionRuntime, type ExecutionAdapter } from "../execution-runtime.js";
import { registerEcpExecutionAdapter } from "./register-ecp-execution.js";

const request = {
  traceId: "ecp-security-contract",
  provider: {
    providerId: "ecp-test-provider",
    modelId: "fixture-model",
    status: "EXECUTABLE" as const,
    capabilities: ["ecp.analyze"],
    healthEvidence: ["TEST_PROVIDER_READY"],
  },
  input: { message: "Analiza el requisito del pliego." },
};

function adapter() {
  const runtime = new ExecutionRuntime();
  const delegate: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
    providerId: "ecp-test-provider",
    execute: vi.fn(async () => ({ output: "respuesta", evidence: ["TEST_PROVIDER_CALLED"] })),
  };
  return { runtime, delegate };
}

describe("ECP isolated pilot security contract", () => {
  it("blocks mixed institutional and local-seed evidence before calling the model", async () => {
    const { runtime, delegate } = adapter();
    const provider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["Dato de prueba"],
          citations: [
            {
              sourceId: "approved-record",
              documentId: "ECP-TEST-001",
              version: "fixture-v1",
              title: "Fixture de prueba (no institucional)",
              excerpt: "Dato sintético para prueba automatizada",
              provenance: "INSTITUTIONAL",
            },
            {
              sourceId: "AUREA_LOCAL_SEED",
              documentId: "local-seed",
              version: "local",
              title: "Memoria local",
              excerpt: "No debe mezclarse con contexto institucional",
              provenance: "LOCAL_SEED",
            },
          ],
        };
      },
    };

    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(provider),
      config: { actorId: "ecp-test", actorRole: "system" },
    });

    await expect(registered.execute(request)).rejects.toThrow(
      "ECP_INSTITUTIONAL_CONTEXT_BLOCKED:ECP_RETRIEVAL_BLOCKED:INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK",
    );
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it("blocks evidence returned under a different project scope", async () => {
    const { runtime, delegate } = adapter();
    const provider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: "personal",
          query: input.query,
          facts: ["Dato fuera del proyecto ECP"],
          citations: [{
            sourceId: "personal-doc",
            documentId: "PERSONAL-001",
            version: "v1",
            title: "Documento personal",
            excerpt: "No es evidencia ECP",
            provenance: "INSTITUTIONAL",
          }],
        };
      },
    };

    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(provider),
      config: { actorId: "ecp-test", actorRole: "system" },
    });

    await expect(registered.execute(request)).rejects.toThrow(
      "ECP_INSTITUTIONAL_CONTEXT_BLOCKED:ECP_PROJECT_SCOPE_MISMATCH",
    );
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it("blocks empty context for an ordinary query instead of treating it as optional", async () => {
    const { runtime, delegate } = adapter();
    const provider: ContextProvider = {
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    };

    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(provider),
      config: { actorId: "ecp-test", actorRole: "system" },
    });

    await expect(registered.execute(request)).rejects.toThrow(
      "ECP_INSTITUTIONAL_CONTEXT_BLOCKED:ECP_RETRIEVAL_BLOCKED:INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK",
    );
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});
