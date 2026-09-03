/** AUREA Work Cell — P0 operational unit. */

export type WorkCellState =
  | "CREATED" | "PLANNING" | "READY" | "RUNNING" | "WAITING" | "BLOCKED"
  | "QA" | "COMPLETED" | "CLOSED" | "FAILED" | "ESCALATED" | "CANCELLED";

export interface WorkCell {
  workCellId: string;
  projectId: string;
  companyId: string;
  objective: string;
  owner: string;
  planner: string;
  agents: string[];
  contextPackId?: string;
  dependencies: string[];
  restrictions: string[];
  state: WorkCellState;
  deliverables: string[];
  evidence: string[];
  qaStatus: "PENDING" | "PASS" | "FAIL";
  auditStatus: "PENDING" | "PASS" | "FAIL";
}

export function canCloseWorkCell(cell: WorkCell): boolean {
  return cell.state === "COMPLETED" && cell.qaStatus === "PASS" && cell.auditStatus === "PASS"
    && cell.evidence.length > 0;
}

export function closeWorkCell(cell: WorkCell): WorkCell {
  if (!canCloseWorkCell(cell)) throw new Error("WORK_CELL_CLOSURE_GATE_FAILED");
  return { ...cell, state: "CLOSED" };
}
