import { describe, expect, it } from "vitest";
import { getPracticePhaseGuidance, normalizePracticePhase } from "./practice-phase.js";

describe("SP EXÁMENES practice phase", () => {
  it("accepts preparatoria", () => {
    expect(normalizePracticePhase("preparatoria")).toBe("preparatoria");
    expect(getPracticePhaseGuidance("preparatoria")).toContain("FASE PREPARATORIA");
  });
  it("accepts precontractual", () => {
    expect(normalizePracticePhase("precontractual")).toBe("precontractual");
    expect(getPracticePhaseGuidance("precontractual")).toContain("FASE PRECONTRACTUAL");
  });
  it("preserves compatibility for older clients", () => {
    expect(normalizePracticePhase(undefined)).toBe("general");
  });
  it("rejects unsupported phase values", () => {
    expect(normalizePracticePhase("contractual")).toBeNull();
  });
});
