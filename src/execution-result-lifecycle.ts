/** AUREA execution result lifecycle — binds runtime result to QA/Audit and Work Cell closure. */

import type { ExecutionRuntimeResult } from "./execution-runtime.js";
import { QAAuditGate, QAAuditEvidence } from "./qa-audit-gate.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

export interface ExecutionResultLifecycleRequest {
  workCellId: string;
  traceId: string;
  execution: ExecutionRuntimeResult;
  validation?: QAAuditEvidence;
}

export interface ExecutionResultLifecycleResult {
  status: "FAILED" | "BLOCKED" | "QA_PENDING" | "COMPLETED" | "CLOSED";
  workCell: ReturnType<WorkCellRegistry["get"]>;
  blockers: string[];
  evidence: string[];
}

/**
 * Keeps execution outcome and authoritative Work Cell state synchronized.
 * No result is considered closed without explicit QA and Audit PASS evidence.
 */
export class ExecutionResultLifecycle {
  constructor(
    private readonly registry: WorkCellRegistry,
    private readonly qaAuditGate: QAAuditGate = new QAAuditGate(),
  ) {}

  apply(request: ExecutionResultLifecycleRequest): ExecutionResultLifecycleResult {
    const current = this.registry.get(request.workCellId);
    if (current.state !== "RUNNING") {
      throw new Error(`WORK_CELL_EXECUTION_STATE_REQUIRED:${current.state}`);
    }

    if (request.execution.traceId !== request.traceId) {
      throw new Error("EXECUTION_TRACE_DIVERGENCE");
    }

    if (request.execution.status === "BLOCKED") {
      const blocked = this.registry.transition(
        request.workCellId,
        "BLOCKED",
        request.traceId,
        [...request.execution.evidence, "EXECUTION_BLOCKED"],
      );
      return { status: "BLOCKED", workCell: blocked, blockers: [request.execution.error ?? "EXECUTION_BLOCKED"], evidence: [...blocked.evidence] };
    }

    if (request.execution.status === "FAILED") {
      const failed = this.registry.transition(
        request.workCellId,
        "FAILED",
        request.traceId,
        [...request.execution.evidence, "EXECUTION_FAILED"],
      );
      return { status: "FAILED", workCell: failed, blockers: [request.execution.error ?? "EXECUTION_FAILED"], evidence: [...failed.evidence] };
    }

    if (request.execution.status !== "SUCCEEDED" && request.execution.status !== "REPLAYED") {
      throw new Error(`UNEXPECTED_EXECUTION_STATUS:${request.execution.status}`);
    }

    const executionEvidence = request.execution.status === "REPLAYED"
      ? [...request.execution.evidence, "EXECUTION_REPLAYED_FROM_DURABLE_RESULT"]
      : request.execution.evidence;

    const qaCell = this.registry.transition(
      request.workCellId,
      "QA",
      request.traceId,
      [...executionEvidence, "EXECUTION_SUCCEEDED", "QA_STARTED"],
    );

    if (!request.validation) {
      return { status: "QA_PENDING", workCell: qaCell, blockers: ["QA_VALIDATION_REQUIRED"], evidence: [...qaCell.evidence] };
    }

    const gate = this.qaAuditGate.evaluate(qaCell, request.validation);
    this.registry.recordValidation(
      request.workCellId,
      request.traceId,
      request.validation.qaStatus,
      request.validation.auditStatus,
      gate.evidence,
    );

    if (request.validation.qaStatus !== "PASS" || request.validation.auditStatus !== "PASS") {
      return {
        status: "QA_PENDING",
        workCell: this.registry.get(request.workCellId),
        blockers: gate.blockers.length > 0 ? gate.blockers : ["QA_OR_AUDIT_NOT_PASSED"],
        evidence: [...gate.evidence],
      };
    }

    const completed = this.registry.transition(
      request.workCellId,
      "COMPLETED",
      request.traceId,
      ["QA_PASS", "AUDIT_PASS", "WORK_CELL_COMPLETED"],
    );

    const closureGate = this.qaAuditGate.evaluate(completed, request.validation);
    if (closureGate.status === "BLOCKED") {
      return {
        status: "COMPLETED",
        workCell: this.registry.get(request.workCellId),
        blockers: closureGate.blockers,
        evidence: [...closureGate.evidence],
      };
    }

    const closed = this.registry.transition(request.workCellId, "CLOSED", request.traceId, ["WORK_CELL_CLOSED"]);
    return { status: "CLOSED", workCell: closed, blockers: [], evidence: [...completed.evidence, ...closed.evidence] };
  }
}
