import { describe, expect, it } from "vitest";
import { buildRadarOpportunity } from "./aurea-radar";

describe("AUREA Radar", () => {
  it("requires evidence before accepting an opportunity", () => {
    expect(() => buildRadarOpportunity({
      id: "claude-code-benchmark-001",
      title: "Reusable skills and connectors",
      category: "SKILL",
      evidence: [{
        sourceId: "video-001",
        sourceType: "VIDEO",
        capturedAt: "2026-08-29T17:50:00-05:00",
        claims: ["Skills and connectors are presented as reusable capabilities."],
        verified: true,
      }],
      reuseTargets: ["skill-registry", "connector-registry"],
      disposition: "INTEGRATE",
      rationale: "The observed pattern matches the governed capability model already adopted by AUREA.",
      confidence: "HIGH",
    })).not.toThrow();
  });

  it("rejects unsupported opportunities without evidence", () => {
    expect(() => buildRadarOpportunity({
      id: "missing-evidence",
      title: "Unverified claim",
      category: "OTHER",
      evidence: [],
      reuseTargets: [],
      disposition: "WATCH",
      rationale: "Needs verification.",
      confidence: "LOW",
    })).toThrow("RADAR_EVIDENCE_REQUIRED");
  });
});
