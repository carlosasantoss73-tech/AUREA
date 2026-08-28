/** AUREA Harness P0 — execution envelope around agent/tool calls. */
import { evaluatePermission, PermissionRequest, PermissionResult } from "./permission-gateway";

export interface HarnessRequest extends PermissionRequest {
  payload?: unknown;
  dryRun?: boolean;
}

export interface ExecutionEnvelope {
  traceId: string;
  request: HarnessRequest;
  permission: PermissionResult;
  status: "READY" | "BLOCKED";
  payload?: unknown;
}

export function buildExecutionEnvelope(request: HarnessRequest, traceId = crypto.randomUUID()): ExecutionEnvelope {
  const permission = evaluatePermission(request, traceId);
  const status = permission.decision === "ALLOW" || permission.decision === "ALLOW_WITH_LIMITS" ? "READY" : "BLOCKED";
  return { traceId, request, permission, status, payload: status === "READY" && !request.dryRun ? request.payload : undefined };
}

export function assertExecutable(envelope: ExecutionEnvelope): void {
  if (envelope.status !== "READY") {
    throw new Error(`AUREA_HARNESS_BLOCKED:${envelope.permission.reason}`);
  }
}
