export type AutonomyState =
  | "IDLE"
  | "PLANNED"
  | "AUTHORIZED"
  | "EXECUTING"
  | "VERIFYING"
  | "LEARNING"
  | "COMPLETED"
  | "BLOCKED";

export type AutonomyEvent =
  | "OBJECTIVE_RECEIVED"
  | "PLAN_READY"
  | "EXECUTION_AUTHORIZED"
  | "EXECUTION_FINISHED"
  | "QA_PASS"
  | "QA_FAIL"
  | "LEARNING_RECORDED"
  | "BLOCKED";

export interface AutonomyTransition {
  from: AutonomyState;
  event: AutonomyEvent;
  to: AutonomyState;
}

const transitions: AutonomyTransition[] = [
  { from: "IDLE", event: "OBJECTIVE_RECEIVED", to: "PLANNED" },
  { from: "PLANNED", event: "PLAN_READY", to: "AUTHORIZED" },
  { from: "AUTHORIZED", event: "EXECUTION_AUTHORIZED", to: "EXECUTING" },
  { from: "EXECUTING", event: "EXECUTION_FINISHED", to: "VERIFYING" },
  { from: "VERIFYING", event: "QA_PASS", to: "LEARNING" },
  { from: "VERIFYING", event: "QA_FAIL", to: "BLOCKED" },
  { from: "LEARNING", event: "LEARNING_RECORDED", to: "COMPLETED" },
  { from: "IDLE", event: "BLOCKED", to: "BLOCKED" },
  { from: "PLANNED", event: "BLOCKED", to: "BLOCKED" },
  { from: "AUTHORIZED", event: "BLOCKED", to: "BLOCKED" },
  { from: "EXECUTING", event: "BLOCKED", to: "BLOCKED" },
  { from: "VERIFYING", event: "BLOCKED", to: "BLOCKED" },
];

/**
 * C8 Autonomy controller: makes the closed-loop lifecycle explicit.
 * It orchestrates state transitions; it does not claim autonomous execution itself.
 */
export class AutonomyCycle {
  constructor(public state: AutonomyState = "IDLE") {}

  transition(event: AutonomyEvent): AutonomyState {
    const transition = transitions.find(
      (candidate) => candidate.from === this.state && candidate.event === event,
    );
    if (!transition) {
      throw new Error(`INVALID_AUTONOMY_TRANSITION:${this.state}:${event}`);
    }
    this.state = transition.to;
    return this.state;
  }
}
