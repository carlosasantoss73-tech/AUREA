import { describe, expect, it } from "vitest";
import { assessCandidate, SupervisorCandidate } from "./aurea-supervisor";
const evidence = [{ sourceId: "s1", title: "Primary source", verified: true, claims: ["capability exists"] }];
const candidate: SupervisorCandidate = { id: "candidate-1", name: "Example capability", category: "PROVIDER", description: "Example", evidence };
describe("AUREA Supervisor", () => {
  it("watches candidates without verified evidence", () => { expect(assessCandidate({ ...candidate, evidence: [{ ...evidence[0], verified: false }] }).decision).toBe("WATCH"); });
  it("prevents duplication when an existing capability overlaps", () => { const r=assessCandidate({ ...candidate, existingCapabilityIds:["existing-1"] }); expect(r.decision).toBe("EXPERIMENT"); expect(r.requiresHumanApproval).toBe(true); });
  it("requires human approval for a verified new capability", () => { const r=assessCandidate(candidate); expect(r.decision).toBe("PROPOSE"); expect(r.requiresHumanApproval).toBe(true); });
});
