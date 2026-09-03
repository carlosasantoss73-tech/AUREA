/** AUREA Execution Gate — controlled transition from READY Work Cell to RUNNING. */

import { EffectClass, evaluatePermission, PermissionResult } from "./security/permission-gateway.js";
import { WorkCell } from "./work-cell.js";
import { AureaSentinel } from "./sentinel.js";

export interface ExecutionGateRequest {
  traceId: string;
  workCell: WorkCell;
  actorId: string;
  actorRole: string;
  capabilityId: string;
  toolId: string;
  action: string;
  effectClass: EffectClass;
  allowedProjects?: string[];
  allowedCapabilities?: string[];
  allowedTools?: string[];
  approvedByHuman?: boolean;
  maxCalls?: number;
  callsUsed?: number;
}

export interface ExecutionGateResult {
  status: "AUTHORIZED" | "BLOCKED";
  workCell: WorkCell;
  permission: PermissionResult;
  blockers: string[];
  evidence: string[];
}

/**
 * Execution is not implied by planning. This gate requires an eligible Work Cell
 * and an explicit permission decision before the cell can enter RUNNING.
 */
export class AureaExecutionGate {
  constructor(private readonly sentinel: AureaSentinel) {}

  authorize(request: ExecutionGateRequest): ExecutionGateResult {
    const blockers: string[] = [];
    const evidence = [`WORK_CELL:${request.workCell.workCellId}`, `PROJECT:${request.workCell.projectId}`];

    if (request.workCell.state !== "READY") {
      blockers.push(`WORK_CELL_NOT_READY:${request.workCell.state}`);
      const permission = { decision: "DENY" as const, reason: "WORK_CELL_NOT_READY", traceId: request.traceId };
      this.block(request, "WORK_CELL_NOT_READY");
      return { status: "BLOCKED", workCell: request.workCell, permission, blockers, evidence };
    }

    const permission = evaluatePermission({
      actorId: request.actorId,
      actorRole: request.actorRole,
      projectId: request.workCell.projectId,
      capabilityId: request.capabilityId,
      toolId: request.toolId,
      action: request.action,
      effectClass: request.effectClass,
      allowedProjects: request.allowedProjects,
      allowedCapabilities: request.allowedCapabilities,
      allowedTools: request.allowedTools,
      approvedByHuman: request.approvedByHuman,
      maxCalls: request.maxCalls,
      callsUsed: request.callsUsed,
    }, request.traceId);
    evidence.push(`PERMISSION:${permission.decision}`);

    if (permission.decision === "DENY" || permission.decision === "REQUIRE_APPROVAL") {
      blockers.push(permission.reason);
      this.block(request, permission.reason);
      return { status: "BLOCKED", workCell: request.workCell, permission, blockers, evidence };
    }

    return {
      status: "AUTHORIZED",
      workCell: { ...request.workCell, state: "RUNNING" },
      permission,
      blockers,
      evidence,
    };
  }

  private block(request: ExecutionGateRequest, reason: string): void {
    this.sentinel.observe({
      signalId: `${request.traceId}-execution-gate`,
      traceId: request.traceId,
      domain: "EXECUTION",
      component: "execution-gate",
      symptom: reason,
      severity: "S2",
      evidence: [`TRACE:${request.traceId}`, `WORK_CELL:${request.workCell.workCellId}`],
      projectId: request.workCell.projectId,
      workCellId: request.workCell.workCellId,
    });
  }
}
