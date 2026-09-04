import type { ContextRetrievalResult } from "./context/context-retrieval-gate.js";
import type { ExecutionRuntimeResult } from "./execution-runtime.js";

export interface ExecutionProvenanceEnvelope {
  traceId: string;
  contextStatus: ContextRetrievalResult["status"];
  sourceIds: string[];
  documentIds: string[];
  contextFacts: string[];
  providerId?: string;
  modelId?: string;
  executionStatus: ExecutionRuntimeResult["status"];
  evidence: string[];
}

/**
 * Preserves the evidence chain from retrieved context into an execution result.
 * It is intentionally a pure boundary: it does not alter Knowledge OS content.
 */
export function bindExecutionProvenance(
  context: ContextRetrievalResult,
  execution: ExecutionRuntimeResult,
): ExecutionProvenanceEnvelope {
  if (context.traceId !== execution.traceId) throw new Error("PROVENANCE_TRACE_DIVERGENCE");
  if (!["READY", "NOT_NEEDED"].includes(context.status)) {
    throw new Error(`PROVENANCE_CONTEXT_NOT_EXECUTABLE:${context.status}`);
  }

  const citations = context.context?.citations ?? [];
  const facts = context.context?.facts ?? [];
  const evidence = [
    ...execution.evidence,
    `CONTEXT_STATUS:${context.status}`,
    ...citations.map(citation => `CONTEXT_SOURCE:${citation.sourceId}`),
  ];

  return {
    traceId: execution.traceId,
    contextStatus: context.status,
    sourceIds: [...new Set(citations.map(citation => citation.sourceId))],
    documentIds: [...new Set(citations.flatMap(citation => citation.documentId ? [citation.documentId] : []))],
    contextFacts: [...facts],
    providerId: execution.providerId,
    modelId: execution.modelId,
    executionStatus: execution.status,
    evidence: [...new Set(evidence)],
  };
}
