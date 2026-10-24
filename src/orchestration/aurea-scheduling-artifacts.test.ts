import { describe, expect, it } from "vitest";
import { validateArtifact, validateSchedule } from "./aurea-scheduling-artifacts";

describe("AUREA scheduling and artifacts", () => {
  it("validates an approved scheduling contract", () => {
    expect(validateSchedule({ id: "schedule-1", planId: "plan-1", status: "APPROVED", timezone: "America/Guayaquil", cadence: "DAILY" }).valid).toBe(true);
  });

  it("requires a plan and artifact identity", () => {
    const result = validateArtifact({ id: "", planId: "", type: "REPORT", createdAt: "2026-08-29T00:00:00Z", sourceIds: [], content: {} });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(["ARTIFACT_ID_REQUIRED", "PLAN_ID_REQUIRED"]);
    expect(result.warnings).toContain("ARTIFACT_HAS_NO_SOURCE_IDS");
  });
});
