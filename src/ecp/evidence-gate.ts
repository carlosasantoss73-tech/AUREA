/**
 * ECP — Experto en Contratación Pública del Ecuador.
 * A conservative, deterministic gate for procurement-audit findings.
 *
 * This module does not interpret law by itself and does not replace review.
 * It prevents findings from being promoted without primary, traceable evidence.
 */
export type EcpFindingStatus = "CUMPLE" | "NO_CUMPLE" | "CONVALIDABLE" | "NO_CONCLUYENTE";

export type EcpSourceKind =
  | "PLIEGO_TDR"
  | "PRIMARY_OFFER"
  | "OFFICIAL_NORMATIVE"
  | "OFFICIAL_PORTAL"
  | "SECONDARY"
  | "TRANSFER_NOTE";

export interface EcpEvidenceReference {
  sourceKind: EcpSourceKind;
  document: string;
  pageOrSection?: string;
  excerpt?: string;
  /** True only when the cited source is the original/official source, not a summary. */
  primary: boolean;
  /** Relevant to the offer deadline; never inferred from a later-created document. */
  existedByOfferDeadline?: boolean;
}

export type EcpDefectKind =
  | "NONE"
  | "FORMAL_OMISSION"
  | "ILLEGIBLE_COPY"
  | "IDENTITY_CLARIFICATION"
  | "MISSING_CAPACITY"
  | "POST_DEADLINE_CHANGE"
  | "CONTRADICTION";

export interface EcpAssessmentInput {
  requirementId: string;
  requirementText: string;
  /** Set true only after the procedure's applicable legal regime and rule are verified. */
  applicableRuleVerified: boolean;
  requirementEvidence: EcpEvidenceReference[];
  offerEvidence: EcpEvidenceReference[];
  /** A direct, evidence-supported assessment of whether the offer satisfies the requirement. */
  evidenceShowsRequirementMet?: boolean;
  evidenceShowsRequirementFailed?: boolean;
  defectKind?: EcpDefectKind;
  /** Must be grounded in the applicable rule, not assumed by the model. */
  convalidationAllowedByApplicableRule?: boolean;
  /** True if the proposed clarification would create capacity or materially change the offer. */
  createsNewCapacityOrMaterialChange?: boolean;
}

export interface EcpAssessmentResult {
  requirementId: string;
  status: EcpFindingStatus;
  reasons: string[];
  evidence: EcpEvidenceReference[];
  blocked: boolean;
}

const REQUIREMENT_SOURCE = (e: EcpEvidenceReference) =>
  e.sourceKind === "PLIEGO_TDR" && e.primary;
const OFFER_SOURCE = (e: EcpEvidenceReference) =>
  e.sourceKind === "PRIMARY_OFFER" && e.primary;

function hasTraceableLocation(e: EcpEvidenceReference): boolean {
  return Boolean(e.document.trim() && e.pageOrSection?.trim());
}

/**
 * Fail-closed classification:
 * - CUMPLE / NO_CUMPLE require the applicable rule plus traceable primary sources.
 * - CONVALIDABLE requires a permitted formal clarification and proof the fact existed
 *   by the offer deadline, without creating capacity or materially changing the offer.
 * - Any evidentiary or legal gap stays NO_CONCLUYENTE.
 */
export function assessEcpFinding(input: EcpAssessmentInput): EcpAssessmentResult {
  const evidence = [...input.requirementEvidence, ...input.offerEvidence];
  const reasons: string[] = [];
  const finish = (status: EcpFindingStatus, reason: string, blocked = status === "NO_CONCLUYENTE") => ({
    requirementId: input.requirementId,
    status,
    reasons: [...reasons, reason],
    evidence,
    blocked,
  });

  if (!input.requirementId.trim() || !input.requirementText.trim()) {
    return finish("NO_CONCLUYENTE", "REQUIREMENT_NOT_IDENTIFIED");
  }
  if (!input.applicableRuleVerified) {
    return finish("NO_CONCLUYENTE", "APPLICABLE_REGIME_OR_RULE_NOT_VERIFIED");
  }
  if (!input.requirementEvidence.some(REQUIREMENT_SOURCE) ||
      !input.requirementEvidence.filter(REQUIREMENT_SOURCE).some(hasTraceableLocation)) {
    return finish("NO_CONCLUYENTE", "PRIMARY_REQUIREMENT_SOURCE_WITH_LOCATION_REQUIRED");
  }
  if (!input.offerEvidence.some(OFFER_SOURCE) ||
      !input.offerEvidence.filter(OFFER_SOURCE).some(hasTraceableLocation)) {
    return finish("NO_CONCLUYENTE", "PRIMARY_OFFER_EVIDENCE_WITH_LOCATION_REQUIRED");
  }
  if (input.evidenceShowsRequirementMet === true && input.evidenceShowsRequirementFailed === true) {
    return finish("NO_CONCLUYENTE", "CONTRADICTORY_FINDINGS_FLAGS");
  }
  if (input.defectKind === "CONTRADICTION") {
    return finish("NO_CONCLUYENTE", "CONTRADICTION_REQUIRES_RESOLUTION");
  }

  if (input.defectKind && input.defectKind !== "NONE" &&
      ["FORMAL_OMISSION", "ILLEGIBLE_COPY", "IDENTITY_CLARIFICATION"].includes(input.defectKind)) {
    if (input.createsNewCapacityOrMaterialChange === true) {
      if (input.evidenceShowsRequirementFailed === true) {
        return finish("NO_CUMPLE", "PROPOSED_CORRECTION_CREATES_CAPACITY_OR_MATERIALLY_CHANGES_OFFER");
      }
      return finish("NO_CONCLUYENTE", "MATERIAL_CHANGE_PROPOSED_BUT_BASELINE_FAILURE_NOT_ESTABLISHED");
    }
    const preexistingEvidence = input.offerEvidence.some(
      e => OFFER_SOURCE(e) && e.existedByOfferDeadline === true && hasTraceableLocation(e),
    );
    if (input.convalidationAllowedByApplicableRule === true && preexistingEvidence) {
      return finish("CONVALIDABLE", "FORMAL_DEFECT_ONLY_AND_PREEXISTING_FACT_EVIDENCED", false);
    }
    return finish("NO_CONCLUYENTE", "CONVALIDATION_NOT_PROVEN_PERMITTED_OR_PREEXISTING_FACT_NOT_EVIDENCED");
  }

  if (input.defectKind === "POST_DEADLINE_CHANGE" || input.defectKind === "MISSING_CAPACITY") {
    if (input.evidenceShowsRequirementFailed === true && input.evidenceShowsRequirementMet !== true) {
      return finish("NO_CUMPLE", "OBJECTIVE_REQUIREMENT_FAILURE_SUPPORTED_BY_PRIMARY_EVIDENCE", false);
    }
    return finish("NO_CONCLUYENTE", "CAPACITY_FAILURE_NOT_ESTABLISHED_BY_DIRECT_EVIDENCE");
  }

  if (input.evidenceShowsRequirementMet === true && input.evidenceShowsRequirementFailed !== true) {
    return finish("CUMPLE", "REQUIREMENT_MET_BY_TRACEABLE_PRIMARY_EVIDENCE", false);
  }
  if (input.evidenceShowsRequirementFailed === true && input.evidenceShowsRequirementMet !== true) {
    return finish("NO_CUMPLE", "REQUIREMENT_FAILURE_BY_TRACEABLE_PRIMARY_EVIDENCE", false);
  }
  return finish("NO_CONCLUYENTE", "DIRECT_EVIDENCE_DOES_NOT_RESOLVE_COMPLIANCE");
}
