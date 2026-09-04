/** AUREA Work Cell Registry — authoritative in-process state boundary for cell lifecycle. */

import { WorkCell, WorkCellState } from "./work-cell.js";

export interface WorkCellTransition {
  workCellId: string;
  from: WorkCellState;
  to: WorkCellState;
  traceId: string;
  evidence: string[];
  timestamp: string;
}

const ALLOWED_TRANSITIONS: Record<WorkCellState, readonly WorkCellState[]> = {
  CREATED: ["PLANNING", "CANCELLED"],
  PLANNING: ["READY", "BLOCKED", "CANCELLED"],
  READY: ["RUNNING", "BLOCKED", "CANCELLED"],
  RUNNING: ["WAITING", "BLOCKED", "QA", "FAILED", "ESCALATED"],
  WAITING: ["RUNNING", "BLOCKED", "CANCELLED"],
  BLOCKED: ["PLANNING", "READY", "ESCALATED", "CANCELLED"],
  QA: ["COMPLETED", "FAILED", "BLOCKED"],
  COMPLETED: ["CLOSED", "QA"],
  CLOSED: [],
  FAILED: ["PLANNING", "ESCALATED", "CANCELLED"],
  ESCALATED: ["PLANNING", "CANCELLED"],
  CANCELLED: [],
};

export class WorkCellRegistry {
  private readonly cells = new Map<string, WorkCell>();
  private readonly transitions: WorkCellTransition[] = [];

  register(cell: WorkCell): WorkCell {
    if (this.cells.has(cell.workCellId)) throw new Error(`WORK_CELL_ALREADY_REGISTERED:${cell.workCellId}`);
    this.cells.set(cell.workCellId, structuredClone(cell));
    return this.get(cell.workCellId);
  }

  get(workCellId: string): WorkCell {
    const cell = this.cells.get(workCellId);
    if (!cell) throw new Error(`WORK_CELL_NOT_FOUND:${workCellId}`);
    return structuredClone(cell);
  }

  list(): WorkCell[] {
    return [...this.cells.values()].map((cell) => structuredClone(cell));
  }

  transition(workCellId: string, to: WorkCellState, traceId: string, evidence: string[]): WorkCell {
    if (!traceId) throw new Error("TRACE_ID_REQUIRED");
    if (evidence.length === 0) throw new Error("TRANSITION_EVIDENCE_REQUIRED");

    const current = this.cells.get(workCellId);
    if (!current) throw new Error(`WORK_CELL_NOT_FOUND:${workCellId}`);
    if (!ALLOWED_TRANSITIONS[current.state].includes(to)) {
      throw new Error(`INVALID_WORK_CELL_TRANSITION:${current.state}->${to}`);
    }

    const next = { ...current, state: to, evidence: [...new Set([...current.evidence, ...evidence])] };
    this.cells.set(workCellId, structuredClone(next));
    this.transitions.push({
      workCellId,
      from: current.state,
      to,
      traceId,
      evidence: [...evidence],
      timestamp: new Date().toISOString(),
    });
    return this.get(workCellId);
  }

  recordValidation(
    workCellId: string,
    traceId: string,
    qaStatus: "PASS" | "FAIL",
    auditStatus: "PASS" | "FAIL",
    evidence: string[],
  ): WorkCell {
    if (!traceId) throw new Error("TRACE_ID_REQUIRED");
    if (evidence.length === 0) throw new Error("VALIDATION_EVIDENCE_REQUIRED");
    const current = this.cells.get(workCellId);
    if (!current) throw new Error(`WORK_CELL_NOT_FOUND:${workCellId}`);
    if (current.state !== "QA") throw new Error(`VALIDATION_REQUIRES_QA_STATE:${current.state}`);

    const next = {
      ...current,
      qaStatus,
      auditStatus,
      evidence: [...new Set([...current.evidence, ...evidence])],
    };
    this.cells.set(workCellId, structuredClone(next));
    return this.get(workCellId);
  }

  history(workCellId?: string): WorkCellTransition[] {
    return this.transitions
      .filter((item) => !workCellId || item.workCellId === workCellId)
      .map((item) => ({ ...item, evidence: [...item.evidence] }));
  }
}
