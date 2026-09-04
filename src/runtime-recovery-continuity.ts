/** AUREA Runtime Recovery Continuity boundary. */
import type { ExecutionResultStore } from "./execution-result-store.js";
import type { WorkCellPersistenceBridge } from "./work-cell-persistence-bridge.js";
import type { WorkCellRegistry } from "./work-cell-registry.js";

export interface RuntimeRecoveryRequest { workCellId: string; traceId: string; }
export type RuntimeRecoveryStatus = "RECOVERED" | "REPLAY_AVAILABLE" | "BLOCKED";
export interface RuntimeRecoveryResult {
  status: RuntimeRecoveryStatus; workCellId: string; traceId: string;
  recoveredCells: number; durableResultFound: boolean; reservationFound: boolean;
  evidence: string[]; blockers: string[];
}

/** Recovery restores state and inspects durable results; it never executes. */
export class RuntimeRecoveryContinuity {
  constructor(private readonly persistence: WorkCellPersistenceBridge, private readonly registry: WorkCellRegistry, private readonly resultStore: ExecutionResultStore) {}

  async recover(request: RuntimeRecoveryRequest): Promise<RuntimeRecoveryResult> {
    if (!request.workCellId || !request.traceId) return { status: "BLOCKED", workCellId: request.workCellId, traceId: request.traceId, recoveredCells: 0, durableResultFound: false, reservationFound: false, evidence: [], blockers: ["RECOVERY_WORK_CELL_AND_TRACE_REQUIRED"] };
    try {
      const [recoveredCells, durable] = await Promise.all([this.persistence.recover(), this.resultStore.loadState()]);
      const cell = this.registry.get(request.workCellId);
      const completed = durable.completed.find(result => result.traceId === request.traceId);
      const reservationFound = durable.reservedTraceIds.includes(request.traceId);
      if (completed && completed.status !== "SUCCEEDED") return { status: "BLOCKED", workCellId: request.workCellId, traceId: request.traceId, recoveredCells, durableResultFound: true, reservationFound, evidence: ["DURABLE_RESULT_STATUS_INVALID"], blockers: ["RECOVERY_DURABLE_RESULT_NOT_SUCCEEDED"] };
      if (completed) return { status: "REPLAY_AVAILABLE", workCellId: request.workCellId, traceId: request.traceId, recoveredCells, durableResultFound: true, reservationFound, evidence: ["WORK_CELL_RECOVERED", "DURABLE_RESULT_FOUND", `RECOVERED_CELL_STATE:${cell.state}`, "REPLAY_REQUIRES_QA"], blockers: [] };
      return { status: "RECOVERED", workCellId: request.workCellId, traceId: request.traceId, recoveredCells, durableResultFound: false, reservationFound, evidence: ["WORK_CELL_RECOVERED", `RECOVERED_CELL_STATE:${cell.state}`, "DURABLE_RESULT_NOT_FOUND"], blockers: [] };
    } catch (error) {
      return { status: "BLOCKED", workCellId: request.workCellId, traceId: request.traceId, recoveredCells: 0, durableResultFound: false, reservationFound: false, evidence: ["RECOVERY_FAILED_CLOSED"], blockers: [error instanceof Error ? error.message : "RUNTIME_RECOVERY_FAILED"] };
    }
  }
}
