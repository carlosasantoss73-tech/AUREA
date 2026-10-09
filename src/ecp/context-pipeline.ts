import type { ContextRetrievalResult } from "../context/context-retrieval-gate.js";
import { buildEcpContextPack, type EcpContextPack } from "./context-pack.js";

export interface EcpContextPipelineResult {
  status: "READY" | "BLOCKED";
  traceId: string;
  blockers: string[];
  pack?: EcpContextPack;
}

/**
 * ECP-specific composition over AUREA's shared ContextRetrievalGate.
 * The caller must obtain retrieval through the gate with institutionalOnly=true
 * and projectId="ecp"; this function never performs a local fallback.
 */
export function composeEcpContext(
  retrieval: ContextRetrievalResult,
  expectedProjectId = "ecp",
): EcpContextPipelineResult {
  if (retrieval.status !== "READY" || !retrieval.context) {
    return {
      status: "BLOCKED",
      traceId: retrieval.traceId,
      blockers: [`ECP_RETRIEVAL_${retrieval.status}:${retrieval.reason}`],
    };
  }

  if (retrieval.context.projectId !== expectedProjectId) {
    return {
      status: "BLOCKED",
      traceId: retrieval.traceId,
      blockers: ["ECP_PROJECT_SCOPE_MISMATCH"],
    };
  }

  const pack = buildEcpContextPack({
    context: retrieval.context,
    traceId: retrieval.traceId,
    institutionalOnly: true,
  });
  if (pack.status !== "READY") {
    return { status: "BLOCKED", traceId: retrieval.traceId, blockers: pack.blockers, pack };
  }
  return { status: "READY", traceId: retrieval.traceId, blockers: [], pack };
}
