import { WorkCell, canCloseWorkCell } from "./work-cell";

export type GateStatus = "PASS" | "FAIL";

export interface QAAuditEvidence {
  qaStatus: GateStatus;
  auditStatus: GateStatus;
  evidence: string[];
}

export interface QAAuditGateResult {
  status: "READY_TO_CLOSE" | "BLOCKED";
  workCell: WorkCell;
  blockers: string[];
  evidence: string[];
}

/** C4 QA/Audit closure gate. Independent validation before Work Cell closure. */
export class QAAuditGate {
  evaluate(workCell: WorkCell, validation: QAAuditEvidence): QAAuditGateResult {
    const next: WorkCell = {
      ...workCell,
      deliverables: [...workCell.deliverables],
      evidence: [...new Set([...workCell.evidence, ...validation.evidence])],
      qaStatus: validation.qaStatus,
      auditStatus: validation.auditStatus,
    };

    const blockers: string[] = [];
    if (validation.qaStatus !== "PASS") blockers.push("QA_FAILED");
    if (validation.auditStatus !== "PASS") blockers.push("AUDIT_FAILED");
    if (!canCloseWorkCell(next)) blockers.push("WORK_CELL_CLOSURE_GATE_FAILED");

    return {
      status: blockers.length === 0 ? "READY_TO_CLOSE" : "BLOCKED",
      workCell: next,
      blockers,
      evidence: [...next.evidence],
    };
  }
}
