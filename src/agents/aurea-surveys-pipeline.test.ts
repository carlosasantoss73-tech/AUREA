import { describe, expect, it } from "vitest";
import { defaultAureaSurveysTenant } from "./aurea-surveys.js";
import { runAureaSurveysPipeline } from "./aurea-surveys-pipeline.js";

describe("AUREA Surveys pipeline", () => {
  it("produces deterministic results and evidence", () => {
    const result = runAureaSurveysPipeline({
      executionId: "exec-001",
      tenant: defaultAureaSurveysTenant,
      records: [
        { service: "A", answers: { P1: 5, P2: 4, P3: 5, P4: 4, P5: 5, P6: 4 } },
        { service: "A", answers: { P1: 3, P2: 4, P3: 3, P4: 4, P5: 3, P6: 4 } },
      ],
    });
    expect(result.status).toBe("COMPLETED");
    expect(result.result?.aggregates[0]?.averages.P1).toBe(4);
    expect(result.evidence.records.map(r => r.kind)).toEqual([
      "SOURCE", "CALCULATION", "VALIDATION", "RESULT",
    ]);
  });

  it("fails closed on tenant record limit", () => {
    const result = runAureaSurveysPipeline({
      executionId: "exec-002",
      tenant: {
        ...defaultAureaSurveysTenant,
        usageLimits: { recordsPerRun: 1 },
      },
      records: [
        { service: "A", answers: { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5 } },
        { service: "A", answers: { P1: 4, P2: 4, P3: 4, P4: 4, P5: 4, P6: 4 } },
      ],
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("RECORD_LIMIT_EXCEEDED");
  });
});
