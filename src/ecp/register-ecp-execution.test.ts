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
});
