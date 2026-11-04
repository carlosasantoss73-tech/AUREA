export type EvaluationState =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "CONVALIDABLE"
  | "NOT_APPLICABLE"
  | "HUMAN_REVIEW";

export interface EvaluationRequirement { id: string; description: string; mandatory?: boolean; }
export interface EvaluationEvidence {
  id: string; requirementId: string; source: string; documentId?: string;
  location?: string; value: unknown; preExisting: boolean;
}
export interface EvaluationComparison {
  requirementId: string; evidenceIds: string[]; state: EvaluationState;
  rationale: string; correction?: string;
}
export interface EvaluationInput { requirements: EvaluationRequirement[]; evidence: EvaluationEvidence[]; }
export interface EvaluationResult { comparisons: EvaluationComparison[]; blockers: string[]; }

/** Provider-neutral deterministic evaluation. No evidence is invented. */
export class DeterministicEvaluationEngine {
  evaluate(
    input: EvaluationInput,
    compare: (requirement: EvaluationRequirement, evidence: EvaluationEvidence[]) => EvaluationComparison,
  ): EvaluationResult {
    const blockers: string[] = [];
    const comparisons: EvaluationComparison[] = [];
    for (const requirement of input.requirements) {
      const evidence = input.evidence.filter(item => item.requirementId === requirement.id);
      const invalidEvidence = evidence.filter(item => !item.preExisting);
      if (invalidEvidence.length > 0) {
        blockers.push("POST_OFFER_EVIDENCE:" + requirement.id + ":" + invalidEvidence.map(item => item.id).join(","));
      }
      const usableEvidence = evidence.filter(item => item.preExisting);
      const comparison = compare(requirement, usableEvidence);
      if (comparison.requirementId !== requirement.id) {
        blockers.push("COMPARISON_REQUIREMENT_MISMATCH:" + requirement.id);
        continue;
      }
      if (!comparison.rationale.trim()) blockers.push("COMPARISON_MISSING_RATIONALE:" + requirement.id);
      comparisons.push({ ...comparison, evidenceIds: [...comparison.evidenceIds] });
    }
    return { comparisons, blockers };
  }
}