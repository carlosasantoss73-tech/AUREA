import { AureaOrchestrator, OrchestrationPlan, OrchestrationTask } from "./aurea-orchestrator.js";
import {
  OrganizationalRegistry,
  OrganizationalResolution,
} from "./organizational-registry.js";
import {
  EffectClass,
  evaluatePermission,
  PermissionRequest,
  PermissionResult,
} from "./security/permission-gateway.js";
import { AureaSentinel, SentinelSignal } from "./sentinel.js";

export interface VerticalSliceRequest {
  traceId: string;
  projectId: string;
  objective: string;
  responsibilityId: string;
  requiredCapabilityIds: string[];
  actorId: string;
  actorRole: string;
  toolId: string;
  action: string;
  effectClass: EffectClass;
  allowedProjects?: string[];
  allowedCapabilities?: string[];
  allowedTools?: string[];
  approvedByHuman?: boolean;
  maxCalls?: number;
  callsUsed?: number;
  tasks: OrchestrationTask[];
}

export interface VerticalSliceResult {
  traceId: string;
  status: "READY" | "BLOCKED";
  resolution?: OrganizationalResolution;
  permission?: PermissionResult;
  plan?: OrchestrationPlan;
  blockers: string[];
  evidence: string[];
}

/**
 * Thin composition kernel for the first AUREA end-to-end control path.
 * It does not execute providers/tools; it proves that organizational resolution,
 * authorization and orchestration can work together before execution is allowed.
 */
export class AureaVerticalSlice {
  constructor(
    private readonly organization: OrganizationalRegistry,
    private readonly orchestrator: AureaOrchestrator,
    private readonly sentinel: AureaSentinel,
  ) {}

  prepare(request: VerticalSliceRequest): VerticalSliceResult {
    const blockers: string[] = [];
    const evidence: string[] = [];

    let resolution: OrganizationalResolution;
    try {
      resolution = this.organization.resolve(
        request.responsibilityId,
        request.requiredCapabilityIds,
      );
      evidence.push(`ORGANIZATIONAL_RESOLUTION:${request.responsibilityId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "ORGANIZATIONAL_RESOLUTION_FAILED";
      blockers.push(reason);
      this.recordBlock(request, "GOVERNANCE", "organizational-resolution", reason);
      return { traceId: request.traceId, status: "BLOCKED", blockers, evidence };
    }

    if (resolution.candidateAgents.length === 0) {
      blockers.push("NO_ACTIVE_AGENT_FOR_RESPONSIBILITY");
      this.recordBlock(request, "GOVERNANCE", "organizational-resolution", blockers[0]);
      return { traceId: request.traceId, status: "BLOCKED", resolution, blockers, evidence };
    }

    const permissionRequest: PermissionRequest = {
      actorId: request.actorId,
      actorRole: request.actorRole,
      projectId: request.projectId,
      capabilityId: request.requiredCapabilityIds[0] ?? "",
      toolId: request.toolId,
      action: request.action,
      effectClass: request.effectClass,
      approvedByHuman: request.approvedByHuman,
      allowedProjects: request.allowedProjects,
      allowedCapabilities: request.allowedCapabilities,
      allowedTools: request.allowedTools,
      maxCalls: request.maxCalls,
      callsUsed: request.callsUsed,
    };

    const permission = evaluatePermission(permissionRequest, request.traceId);
    evidence.push(`PERMISSION:${permission.decision}`);
    if (permission.decision === "DENY" || permission.decision === "REQUIRE_APPROVAL") {
      blockers.push(permission.reason);
      this.recordBlock(request, "SECURITY", "permission-gateway", permission.reason);
      return {
        traceId: request.traceId,
        status: "BLOCKED",
        resolution,
        permission,
        blockers,
        evidence,
      };
    }

    const plan = this.orchestrator.plan(request.projectId, request.objective, request.tasks);
    evidence.push(`PLAN_STAGE:${plan.currentStage}`);
    if (plan.tasks.length === 0) {
      blockers.push("ORCHESTRATION_PLAN_EMPTY");
      this.recordBlock(request, "EXECUTION", "orchestrator", blockers[0]);
      return {
        traceId: request.traceId,
        status: "BLOCKED",
        resolution,
        permission,
        plan,
        blockers,
        evidence,
      };
    }

    return {
      traceId: request.traceId,
      status: "READY",
      resolution,
      permission,
      plan,
      blockers,
      evidence,
    };
  }

  private recordBlock(
    request: VerticalSliceRequest,
    domain: SentinelSignal["domain"],
    component: string,
    symptom: string,
  ): void {
    this.sentinel.observe({
      signalId: `${request.traceId}-${component}`,
      traceId: request.traceId,
      domain,
      component,
      symptom,
      severity: "S2",
      evidence: [`TRACE:${request.traceId}`, `PROJECT:${request.projectId}`],
      projectId: request.projectId,
    });
  }
}
