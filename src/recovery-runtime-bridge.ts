/** AUREA Recovery Runtime Bridge — connects accepted runtime events to governed Work Cell recovery. */

import { EventDrivenRuntime, RuntimeEvent } from "./event-driven-runtime.js";
import { decideRecovery, RecoveryDecisionResult, RecoveryEvent } from "./recovery-event-contract.js";
import { WorkCell, WorkCellState } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

export interface RecoveryApplicationResult {
  eventId: string;
  decision: RecoveryDecisionResult["decision"];
  applied: boolean;
  workCell: WorkCell;
  evidence: string[];
  reason: string;
}

function recoveryEvent(event: RuntimeEvent): RecoveryEvent {
  return {
    eventId: event.eventId,
    traceId: event.traceId,
    workCellId: event.workCellId ?? "",
    projectId: event.projectId,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    evidence: [`RUNTIME_EVENT_ACCEPTED:${event.eventId}`],
  };
}

/**
 * Applies only deterministic, lifecycle-valid recovery transitions.
 * It never executes tools, grants permissions, selects providers, or turns
 * RESUME/RETRY into an unbounded action. Unsupported states fail closed.
 */
export class RecoveryRuntimeBridge {
  constructor(
    private readonly runtime: EventDrivenRuntime,
    private readonly registry: WorkCellRegistry,
  ) {
    this.runtime.subscribe("EXECUTION_FAILED", (event) => this.handle(event));
    this.runtime.subscribe("EXECUTION_INTERRUPTED", (event) => this.handle(event));
  }

  handle(event: RuntimeEvent): RecoveryApplicationResult {
    if (!event.workCellId) throw new Error("RECOVERY_WORK_CELL_REQUIRED");

    const current = this.registry.get(event.workCellId);
    const decision = decideRecovery(recoveryEvent(event), {
      workCellId: current.workCellId,
      state: current.state,
      traceId: event.traceId,
      evidence: current.evidence,
    });

    const evidence = [...new Set([...decision.evidence, `RECOVERY_DECISION:${decision.decision}`])];
    let workCell = current;
    let applied = false;

    const transition = (to: WorkCellState, marker: string): void => {
      workCell = this.registry.transition(current.workCellId, to, event.traceId, [...evidence, marker]);
      applied = true;
    };

    switch (decision.decision) {
      case "RESUME":
        if (current.state === "WAITING") transition("RUNNING", "RECOVERY_RESUME_APPLIED");
        else if (current.state === "BLOCKED") transition("PLANNING", "RECOVERY_RESUME_REPLAN");
        break;
      case "RETRY_SAFE_STEP":
        if (current.state === "FAILED") transition("PLANNING", "RECOVERY_RETRY_REPLAN");
        break;
      case "CONTAIN":
        if (["RUNNING", "WAITING"].includes(current.state)) transition("BLOCKED", "RECOVERY_CONTAINMENT_APPLIED");
        break;
      case "ESCALATE":
        break;
    }

    return {
      eventId: event.eventId,
      decision: decision.decision,
      applied,
      workCell,
      evidence: [...new Set([...workCell.evidence, ...evidence])],
      reason: applied ? decision.reason : `${decision.reason}:NO_SAFE_TRANSITION`,
    };
  }
}
