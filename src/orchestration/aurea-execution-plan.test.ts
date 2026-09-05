import { describe, expect, it } from "vitest";
import { getReadySteps, validateExecutionPlan, ExecutionPlan } from "./aurea-execution-plan";

const plan: ExecutionPlan = {
  planId: "campaign-001",
  objective: "Prepare a validated marketing campaign",
  steps: [
    { id: "research", kind: "SKILL", capabilityId: "research", parallelSafe: true, idempotencyKey: "campaign-001:research" },
    { id: "creative", kind: "SKILL", capabilityId: "creative", parallelSafe: true, idempotencyKey: "campaign-001:creative" },
    { id: "validate", kind: "VALIDATOR", capabilityId: "validator", dependsOn: ["research", "creative"] },
  ],
};

describe("AUREA execution plan", () => {
  it("validates dependencies and exposes ready work", () => {
    validateExecutionPlan(plan);
    expect(getReadySteps(plan, new Set()).map((step) => step.id)).toEqual(["research", "creative"]);
    expect(getReadySteps(plan, new Set(["research", "creative"])).map((step) => step.id)).toEqual(["validate"]);
  });

  it("requires idempotency for parallel-safe steps", () => {
    expect(() => validateExecutionPlan({
      ...plan,
      steps: [{ id: "unsafe", kind: "TOOL", capabilityId: "tool", parallelSafe: true }],
    })).toThrow("PARALLEL_STEP_REQUIRES_IDEMPOTENCY");
  });

  it("rejects unknown dependencies", () => {
    expect(() => validateExecutionPlan({
      ...plan,
      steps: [{ id: "x", kind: "SKILL", capabilityId: "x", dependsOn: ["missing"] }],
    })).toThrow("UNKNOWN_DEPENDENCY");
  });
});
