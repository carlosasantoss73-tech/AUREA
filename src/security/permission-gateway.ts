/**
 * AUREA Permission Gateway — P0 baseline
 *
 * Security boundary for agent/tool execution.
 * Deny by default. Keep decision deterministic and auditable.
 */

export type PermissionDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "ALLOW_WITH_LIMITS";
export type EffectClass = "READ" | "WRITE" | "EXTERNAL" | "DESTRUCTIVE";

export interface PermissionRequest {
  actorId: string;
  actorRole: string;
  projectId: string;
  capabilityId: string;
  toolId: string;
  action: string;
  effectClass: EffectClass;
  approvedByHuman?: boolean;
  allowedProjects?: string[];
  allowedCapabilities?: string[];
  allowedTools?: string[];
  maxCalls?: number;
  callsUsed?: number;
}

export interface PermissionResult {
  decision: PermissionDecision;
  reason: string;
  traceId: string;
  effectiveLimit?: number;
}

// Keep the public contract general: callers may use externally supplied trace IDs,
// while crypto.randomUUID() remains the default generator.
export function evaluatePermission(req: PermissionRequest, traceId: string = crypto.randomUUID()): PermissionResult {
  if (!req.actorId || !req.actorRole || !req.projectId || !req.capabilityId || !req.toolId || !req.action) {
    return { decision: "DENY", reason: "MISSING_SECURITY_CONTEXT", traceId };
  }
  if (req.allowedProjects && !req.allowedProjects.includes(req.projectId)) {
    return { decision: "DENY", reason: "PROJECT_SCOPE_DENIED", traceId };
  }
  if (req.allowedCapabilities && !req.allowedCapabilities.includes(req.capabilityId)) {
    return { decision: "DENY", reason: "CAPABILITY_NOT_ALLOWED", traceId };
  }
  if (req.allowedTools && !req.allowedTools.includes(req.toolId)) {
    return { decision: "DENY", reason: "TOOL_NOT_REGISTERED_OR_ALLOWED", traceId };
  }
  if (req.effectClass === "DESTRUCTIVE" && !req.approvedByHuman) {
    return { decision: "REQUIRE_APPROVAL", reason: "HUMAN_APPROVAL_REQUIRED", traceId };
  }
  if (req.maxCalls !== undefined && (req.callsUsed ?? 0) >= req.maxCalls) {
    return { decision: "DENY", reason: "RATE_OR_USAGE_LIMIT_REACHED", traceId };
  }
  if (req.maxCalls !== undefined) {
    return { decision: "ALLOW_WITH_LIMITS", reason: "POLICY_ALLOWED_WITH_LIMIT", traceId, effectiveLimit: req.maxCalls };
  }
  return { decision: "ALLOW", reason: "POLICY_ALLOWED", traceId };
}
