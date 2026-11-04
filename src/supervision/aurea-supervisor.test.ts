import { describe, expect, it } from "vitest";
import { assessCandidate, SupervisorCandidate } from "./aurea-supervisor";

const evidence = [{ sourceId: "s1", title: "Primary source", verified: true, claims: ["capability exists"] }];

const candidate: SupervisorCandidate = {
  id: "candidate-1",
  name: "Example capability",
  category: "PROVIDER",
  description: "Example",
  evidence,
};

describe("AUREA Supervisor", () => {
  it("watches candidates without verified evidence", () => {
    const result = assessCandidate({ ...candidate, evidence: [{ ...evidence[0], verified: false }] });
    expect(result.decision).toBe("WATCH");
    expect(result.requiresHumanApproval).toBe(false);
  });

  it("prevents duplication when an existing capability overlaps", () => {
    const result = assessCandidate({ ...candidate, existingCapabilityIds: ["existing-1"] });
    expect(result.decision).toBe("EXPERIMENT");
    expect(result.requiresHumanApproval).toBe(true);
  });

  it("requires human approval for a verified new capability", () => {
    const result = assessCandidate(candidate);
    expect(result.decision).toBe("PROPOSE");
    expect(result.requiresHumanApproval).toBe(true);
  });
});
