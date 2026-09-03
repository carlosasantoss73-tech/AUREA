import { describe, expect, it } from "vitest";
import { AutonomyCycle } from "./autonomy-cycle";

describe("AutonomyCycle", () => {
  it("enforces the full execution-to-learning loop", () => {
    const cycle = new AutonomyCycle();
    expect(cycle.transition("OBJECTIVE_RECEIVED")).toBe("PLANNED");
    expect(cycle.transition("PLAN_READY")).toBe("AUTHORIZED");
    expect(cycle.transition("EXECUTION_AUTHORIZED")).toBe("EXECUTING");
    expect(cycle.transition("EXECUTION_FINISHED")).toBe("VERIFYING");
    expect(cycle.transition("QA_PASS")).toBe("LEARNING");
    expect(cycle.transition("LEARNING_RECORDED")).toBe("COMPLETED");
  });

  it("blocks the cycle after failed verification", () => {
    const cycle = new AutonomyCycle("VERIFYING");
    expect(cycle.transition("QA_FAIL")).toBe("BLOCKED");
  });
});
