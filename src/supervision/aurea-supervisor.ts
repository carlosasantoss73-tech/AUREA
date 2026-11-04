export type SupervisorDecision = "DISCARD" | "WATCH" | "EXPERIMENT" | "PROPOSE";

export interface SupervisorEvidence {
  sourceId: string;
  title: string;
  verified: boolean;
  claims: string[];
}

export interface SupervisorCandidate {
  id: string;
  name: string;
  category: "SKILL" | "CONNECTOR" | "PROVIDER" | "AGENT" | "KNOWLEDGE";
  description: string;
  evidence: SupervisorEvidence[];
  existingCapabilityIds?: string[];
  cost?: { amount?: number; currency?: string; recurring?: boolean };
  securityNotes?: string[];
}

export interface SupervisorAssessment {
  candidateId: string;
  decision: SupervisorDecision;
  rationale: string[];
  requiresHumanApproval: boolean;
  recommendedNextStep: string;
}

/**
 * Strategic review boundary between discovery and activation.
 * It does not install, activate, or execute external capabilities.
 */
export function assessCandidate(candidate: SupervisorCandidate): SupervisorAssessment {
  if (!candidate.evidence.length || candidate.evidence.some((e) => !e.verified)) {
    return {
      candidateId: candidate.id,
      decision: "WATCH",
      rationale: ["Evidence is missing or not fully verified."],
      requiresHumanApproval: false,
      recommendedNextStep: "Collect and verify primary evidence before activation or integration.",
    };
  }

  if (candidate.existingCapabilityIds?.length) {
    return {
      candidateId: candidate.id,
      decision: "EXPERIMENT",
      rationale: ["A related AUREA capability already exists; prefer benchmarking and improvement over duplication."],
      requiresHumanApproval: true,
      recommendedNextStep: "Benchmark against the existing capability and propose a targeted improvement.",
    };
  }

  return {
    candidateId: candidate.id,
    decision: "PROPOSE",
    rationale: ["Evidence is verified and no existing capability was supplied as an overlap."],
    requiresHumanApproval: true,
    recommendedNextStep: "Prepare an integration proposal with permissions, cost, security and test criteria.",
  };
}
