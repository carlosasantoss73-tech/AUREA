import { describe, expect, it, vi } from "vitest";
import { ContextRetrievalGate, type ContextProvider } from "../context/context-retrieval-gate.js";
import { ExecutionRuntime, type ExecutionAdapter } from "../execution-runtime.js";
import { registerEcpExecutionAdapter } from "./register-ecp-execution.js";

describe("registerEcpExecutionAdapter", () => {
  it("registers the ECP institutional decorator using the existing provider identity", () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "ok", evidence: ["PROVIDER_CALLED"] })),
    };
    const contextProvider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: [],
          citations: [{
            sourceId: "institutional-doc",
            documentId: "doc-1",
            version: "v1",
            title: "Documento institucional",
            excerpt: "Evidencia de prueba",
            provenance: "INSTITUTIONAL",
          }],
        };
      },
    };

    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(contextProvider),
      config: { actorId: "ecp-runtime", actorRole: "system" },
    });

    expect(registered.providerId).toBe("existing-provider");
    expect(() => runtime.registerAdapter({
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "duplicate", evidence: ["DUPLICATE"] })),
    })).toThrow("EXECUTION_ADAPTER_ALREADY_REGISTERED:existing-provider");
  });

  it("fails registration early when required actor identity is absent", () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "ok", evidence: ["PROVIDER_CALLED"] })),
    };
    const contextProvider: ContextProvider = {
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    };

    expect(() => registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(contextProvider),
      config: { actorId: " ", actorRole: "system" },
    })).toThrow("ECP_CONTEXT_ACTOR_REQUIRED");
  });

  it("executes through the registered ECP adapter and sends institutional citations to the provider", async () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "análisis", evidence: ["PROVIDER_CALLED"] })),
    };
    const contextProvider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["El requisito exige cuatro vehículos."],
          citations: [{
            sourceId: "institutional-doc",
            documentId: "doc-ecp-1",
            version: "v3",
            title: "Pliego institucional",
            excerpt: "Cuatro vehículos",
            provenance: "INSTITUTIONAL",
          }],
        };
      },
    };
    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(contextProvider),
      config: { actorId: "ecp-runtime", actorRole: "system" },
    });

    const result = await registered.execute({
      traceId: "ecp-registered-trace",
      provider: {
        providerId: "existing-provider",
        modelId: "test-model",
        status: "EXECUTABLE",
        capabilities: ["ecp.analyze"],
        healthEvidence: ["TEST_PROVIDER_READY"],
      },
      input: { message: "Evalúa el requisito." },
    });

    expect(delegate.execute).toHaveBeenCalledOnce();
    const delegatedInput = delegate.execute.mock.calls[0][0].input as { message: string };
    expect(delegatedInput.message).toContain("ID DOCUMENTO: doc-ecp-1");
    expect(delegatedInput.message).toContain("FUENTE: Pliego institucional");
    expect(result.evidence).toContain("ECP_CONTEXT_PIPELINE:READY");
    expect(result.evidence).toContain("ECP_CONTEXT_SOURCE:doc-ecp-1:v3");
  });

  it("blocks the registered ECP adapter before provider invocation when institutional context is unavailable", async () => {
    const runtime = new ExecutionRuntime();
    const delegate: ExecutionAdapter & { execute: ReturnType<typeof vi.fn> } = {
      providerId: "existing-provider",
      execute: vi.fn(async () => ({ output: "must not run", evidence: ["PROVIDER_CALLED"] })),
    };
    const contextProvider: ContextProvider = {
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    };
    const registered = registerEcpExecutionAdapter({
      runtime,
      providerAdapter: delegate,
      contextGate: new ContextRetrievalGate(contextProvider),
      config: { actorId: "ecp-runtime", actorRole: "system" },
    });

    await expect(registered.execute({
      traceId: "ecp-blocked-trace",
      provider: {
        providerId: "existing-provider",
        modelId: "test-model",
        status: "EXECUTABLE",
        capabilities: ["ecp.analyze"],
        healthEvidence: ["TEST_PROVIDER_READY"],
      },
      input: { message: "Evalúa el requisito." },
    })).rejects.toThrow("ECP_INSTITUTIONAL_CONTEXT_BLOCKED");
    expect(delegate.execute).not.toHaveBeenCalled();
  });

});
