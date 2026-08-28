/** AUREA Supervisor P0 — validates execution envelopes before execution. */
import { ExecutionEnvelope } from "./aurea-harness";

export interface SupervisionResult { approved: boolean; reason: string; traceId: string; }

export function supervise(envelope: ExecutionEnvelope): SupervisionResult {
  if (!envelope.traceId) return { approved: false, reason: "MISSING_TRACE", traceId: "" };
  if (envelope.status !== "READY") return { approved: false, reason: "HARNESS_BLOCKED", traceId: envelope.traceId };
  if (["DENY", "REQUIRE_APPROVAL"].includes(envelope.permission.decision)) {
    return { approved: false, reason: envelope.permission.reason, traceId: envelope.traceId };
  }
  return { approved: true, reason: "SUPERVISED", traceId: envelope.traceId };
}
