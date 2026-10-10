import { describe, expect, it } from "vitest";
import { DeterministicSurveyEngine } from "./deterministic-engine.js";

describe("DeterministicSurveyEngine", () => {
  it("calculates P1-P6 averages by service", () => {
    const engine = new DeterministicSurveyEngine();
    const result = engine.calculate([
      { service: "A", answers: { P1: 5, P2: 4, P3: 5, P4: 4, P5: 5, P6: 4 } },
      { service: "A", answers: { P1: 3, P2: 4, P3: 3, P4: 4, P5: 3, P6: 4 } },
      { service: "B", answers: { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5 } },
    ], ["P1", "P2", "P3", "P4", "P5", "P6"]);

    expect(result.aggregates).toEqual([
      { service: "A", count: 2, averages: { P1: 4, P2: 4, P3: 4, P4: 4, P5: 4, P6: 4 } },
      { service: "B", count: 1, averages: { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5 } },
    ]);
    expect(result.excluded).toEqual([]);
  });

  it("excludes missing service and invalid/missing answers without estimating", () => {
    const engine = new DeterministicSurveyEngine();
    const result = engine.calculate([
      { service: "", answers: { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5 } },
      { service: "A", answers: { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5 } },
      { service: "A", answers: { P1: 6, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5 } },
    ], ["P1", "P2", "P3", "P4", "P5", "P6"]);

    expect(result.excluded).toEqual([
      { index: 0, reason: "MISSING_SERVICE" },
      { index: 1, reason: "INVALID_OR_MISSING_P6" },
      { index: 2, reason: "INVALID_OR_MISSING_P1" },
    ]);
  });
});
