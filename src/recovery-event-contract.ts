/** Governed contract connecting durable runtime events with Work Cell recovery decisions. */
export type RecoveryDecision = "RESUME" | "RETRY_SAFE_STEP" | "CONTAIN" | "ESCALATE";

export interface RecoveryEvent {
  eventId: string;
  traceId: string;
  workCellId: string;
  projectId: string;
  eventType: string;
  occurredAt: string;
  evidence: string[];
}

export interface RecoveryStateSnapshot {
  workCellId: string;
  state: string;
  traceId: string;
  evidence: string[];
}

export interface RecoveryDecisionResult {
  decision: RecoveryDecision;
  reason: string;
  evidence: string[];
}

/** Fail-closed decision boundary; execution/recovery side effects remain outside this contract. */
export function decideRecovery(
  event: RecoveryEvent,
  current: RecoveryStateSnapshot,
): RecoveryDecisionResult {
  const evidence = [...new Set([...event.evidence, ...current.evidence])];

  if (event.workCellId !== current.workCellId || event.projectId === "") {
    return { decision: "ESCALATE", reason: "RECOVERY_SCOPE_MISMATCH", evidence };
  }

  if (current.traceId !== event.traceId) {
    return { decision: "ESCALATE", reason: "RECOVERY_TRACE_MISMATCH", evidence };
  }

  if (["CLOSED", "CANCELLED"].includes(current.state)) {
    return { decision: "CONTAIN", reason: "RECOVERY_TERMINAL_WORK_CELL", evidence };
  }

  if (event.eventType === "EXECUTION_FAILED") {
    return { decision: "RETRY_SAFE_STEP", reason: "RECOVERY_RETRY_EXPLICIT_FAILURE", evidence };
  }

  if (event.eventType === "EXECUTION_INTERRUPTED") {
    return { decision: "RESUME", reason: "RECOVERY_RESUME_INTERRUPTED_WORK", evidence };
  }

  return { decision: "ESCALATE", reason: "RECOVERY_EVENT_NOT_RECOGNIZED", evidence };
}
