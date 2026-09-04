import { describe, expect, it } from "vitest";
import { bindExecutionProvenance } from "./execution-provenance.js";
import type { ContextRetrievalResult } from "./context/context-retrieval-gate.js";
import type { ExecutionRuntimeResult } from "./execution-runtime.js";

const context: ContextRetrievalResult = {
  traceId: "trace-prov-1",
  status: "READY",
  reason: "HISTORICAL_CONTEXT_RETRIEVED",
  context: {
    query: "previous work",
    projectId: "p-1",
    citations: [
      { sourceId: "src-1", documentId: "doc-1", version: 3 },
      { sourceId: "src-2", documentId: "doc-2", version: 1 },
    ],
    facts: ["fact-a"],
  },
};

const execution: ExecutionRuntimeResult = {
  status: "SUCCEEDED",
  traceId: "trace-prov-1",
  providerId: "provider-1",
  modelId: "model-1",
  output: "result",
  evidence: ["EXECUTION:OK"],
};

describe("bindExecutionProvenance", () => {
  it("retains source, document and fact provenance", () => {
    const result = bindExecutionProvenance(context, execution);

    expect(result.traceId).toBe("trace-prov-1");
    expect(result.sourceIds).toEqual(["src-1", "src-2"]);
    expect(result.documentIds).toEqual(["doc-1", "doc-2"]);
    expect(result.contextFacts).toEqual(["fact-a"]);
    expect(result.providerId).toBe("provider-1");
    expect(result.evidence).toContain("CONTEXT_SOURCE:src-1");
  });

  it("fails closed on trace divergence", () => {
    expect(() => bindExecutionProvenance(context, { ...execution, traceId: "other-trace" })).toThrow("PROVENANCE_TRACE_DIVERGENCE");
  });

  it("fails closed when context retrieval was blocked", () => {
    expect(() => bindExecutionProvenance({ ...context, status: "BLOCKED", reason: "DENIED", context: undefined }, execution)).toThrow("PROVENANCE_CONTEXT_NOT_EXECUTABLE:BLOCKED");
  });
});
