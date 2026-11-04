import { describe, expect, it } from "vitest";
import { DeterministicEvaluationEngine, type EvaluationRequirement } from "./evaluation-engine.js";

const requirement: EvaluationRequirement = { id: "REQ-1", description: "Required capacity", mandatory: true };

describe("DeterministicEvaluationEngine", () => {
  it("supports evidence-backed compliance", () => {
    const result = new DeterministicEvaluationEngine().evaluate(
      { requirements: [requirement], evidence: [{ id: "E-1", requirementId: "REQ-1", source: "official-document", value: "present", preExisting: true }] },
      (req, evidence) => ({ requirementId: req.id, evidenceIds: evidence.map(item => item.id), state: "COMPLIANT", rationale: "Evidence supports the requirement." }),
    );
    expect(result.blockers).toEqual([]);
    expect(result.comparisons[0]).toMatchObject({ requirementId: "REQ-1", state: "COMPLIANT", evidenceIds: ["E-1"] });
  });

  it("keeps missing evidence out of a compliance conclusion", () => {
    const result = new DeterministicEvaluationEngine().evaluate(
      { requirements: [requirement], evidence: [] },
      (req, evidence) => ({ requirementId: req.id, evidenceIds: evidence.map(item => item.id), state: "HUMAN_REVIEW", rationale: "No evidence was supplied." }),
    );
    expect(result.comparisons[0].state).toBe("HUMAN_REVIEW");
    expect(result.comparisons[0].evidenceIds).toEqual([]);
  });

  it("separates convalidability from compliance", () => {
    const result = new DeterministicEvaluationEngine().evaluate(
      { requirements: [requirement], evidence: [{ id: "E-1", requirementId: "REQ-1", source: "bid-document", value: "formal defect", preExisting: true }] },
      (req, evidence) => ({ requirementId: req.id, evidenceIds: evidence.map(item => item.id), state: "CONVALIDABLE", rationale: "The evidence predates the evaluation and the defect is formal.", correction: "Request clarification of the same pre-existing evidence." }),
    );
    expect(result.comparisons[0].state).toBe("CONVALIDABLE");
    expect(result.comparisons[0].correction).toContain("pre-existing");
  });

  it("blocks post-offer evidence from being used as evaluation evidence", () => {
    const result = new DeterministicEvaluationEngine().evaluate(
      { requirements: [requirement], evidence: [{ id: "E-POST", requirementId: "REQ-1", source: "later-document", value: "new capacity", preExisting: false }] },
      (req, evidence) => ({ requirementId: req.id, evidenceIds: evidence.map(item => item.id), state: "HUMAN_REVIEW", rationale: "No valid pre-existing evidence is available." }),
    );
    expect(result.blockers).toEqual(["POST_OFFER_EVIDENCE:REQ-1:E-POST"]);
    expect(result.comparisons[0].evidenceIds).toEqual([]);
  });

  it("blocks a comparator that changes the requirement identity", () => {
    const result = new DeterministicEvaluationEngine().evaluate(
      { requirements: [requirement], evidence: [] },
      () => ({ requirementId: "REQ-OTHER", evidenceIds: [], state: "HUMAN_REVIEW", rationale: "Invalid comparator." }),
    );
    expect(result.blockers).toContain("COMPARISON_REQUIREMENT_MISMATCH:REQ-1");
    expect(result.comparisons).toEqual([]);
  });
});