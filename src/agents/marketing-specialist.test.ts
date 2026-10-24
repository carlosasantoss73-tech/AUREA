import { describe, expect, it } from "vitest";
import { MARKETING_SPECIALIST_PROFILE } from "./marketing-specialist";

describe("marketing specialist agent", () => {
  it("has the required professional scope", () => {
    expect(MARKETING_SPECIALIST_PROFILE.expertise).toContain("real-estate marketing");
    expect(MARKETING_SPECIALIST_PROFILE.expertise).toContain("AI-assisted audiovisual production");
    expect(MARKETING_SPECIALIST_PROFILE.responsibilities.length).toBeGreaterThanOrEqual(5);
  });

  it("protects verified commercial claims and approvals", () => {
    expect(MARKETING_SPECIALIST_PROFILE.guardrails).toContain(
      "Never invent prices, locations, distances, infrastructure, guarantees or product features.",
    );
    expect(MARKETING_SPECIALIST_PROFILE.guardrails).toContain(
      "Never activate external providers or spend credits without the required approval boundary.",
    );
  });
});
