/** AUREA Execution State Bridge — commits authorized execution into the authoritative Work Cell registry. */

import { AureaExecutionGate, ExecutionGateRequest, ExecutionGateResult } from "./execution-gate.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

export interface ExecutionStateBridgeResult extends ExecutionGateResult {
  stateCommitted: boolean;
}

/**
 * Planning/authorization and authoritative state are separate boundaries.
 * This bridge commits READY -> RUNNING only after the execution gate authorizes it.
 */
export class ExecutionStateBridge {
  constructor(
    private readonly executionGate: AureaExecutionGate,
    private readonly registry: WorkCellRegistry,
  ) {}

  authorizeAndCommit(request: ExecutionGateRequest): ExecutionStateBridgeResult {
    const decision = this.executionGate.authorize(request);

    if (decision.status === "BLOCKED") {
      return { ...decision, stateCommitted: false };
    }

    const current = this.registry.get(request.workCell.workCellId);
    if (current.state !== request.workCell.state) {
      throw new Error(`WORK_CELL_STATE_DIVERGENCE:${current.state}!=${request.workCell.state}`);
    }

    const committed = this.registry.transition(
      request.workCell.workCellId,
      "RUNNING",
      request.traceId,
      [...decision.evidence, "EXECUTION_STATE_COMMITTED"],
    );

    return {
      ...decision,
      workCell: committed,
      stateCommitted: true,
    };
  }
}
