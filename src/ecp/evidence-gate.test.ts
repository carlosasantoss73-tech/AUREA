import { describe, expect, it } from "vitest";
import { assessEcpFinding, type EcpAssessmentInput, type EcpEvidenceReference } from "./evidence-gate.js";

const requirement: EcpEvidenceReference = {
  sourceKind: "PLIEGO_TDR", document: "Pliego oficial", pageOrSection: "Sección 4.2",
  primary: true,
};
const offer: EcpEvidenceReference = {
  sourceKind: "PRIMARY_OFFER", document: "Oferta original", pageOrSection: "PDF p. 18",
  primary: true, existedByOfferDeadline: true,
};
const base: EcpAssessmentInput = {
  requirementId: "R-01", requirementText: "Acreditar requisito mínimo",
  applicableRuleVerified: true, requirementEvidence: [requirement], offerEvidence: [offer],
};

describe("ECP evidence gate", () => {
  it("blocks a finding when the applicable legal regime is not verified", () => {
    expect(assessEcpFinding({ ...base, applicableRuleVerified: false, evidenceShowsRequirementMet: true }).status)
      .toBe("NO_CONCLUYENTE");
  });

  it("does not accept a secondary source as the requirement source", () => {
    expect(assessEcpFinding({
      ...base,
      requirementEvidence: [{ ...requirement, sourceKind: "SECONDARY", primary: false }],
      evidenceShowsRequirementMet: true,
    }).status).toBe("NO_CONCLUYENTE");
  });

  it("marks CUMPLE only with direct primary evidence and verified rule", () => {
    expect(assessEcpFinding({ ...base, evidenceShowsRequirementMet: true }).status).toBe("CUMPLE");
  });

  it("marks NO CUMPLE only when the failure is directly evidenced", () => {
    expect(assessEcpFinding({
      ...base, evidenceShowsRequirementFailed: true, defectKind: "MISSING_CAPACITY",
    }).status).toBe("NO_CUMPLE");
  });

  it("keeps contradictory evidence inconclusive", () => {
    expect(assessEcpFinding({
      ...base, evidenceShowsRequirementMet: true, evidenceShowsRequirementFailed: true,
    }).status).toBe("NO_CONCLUYENTE");
  });

  it("allows convalidation only for a permitted formal defect with pre-existing proof", () => {
    expect(assessEcpFinding({
      ...base, defectKind: "ILLEGIBLE_COPY", convalidationAllowedByApplicableRule: true,
    }).status).toBe("CONVALIDABLE");
  });

  it("does not allow convalidation to create capacity or materially change the offer", () => {
    expect(assessEcpFinding({
      ...base, defectKind: "FORMAL_OMISSION", convalidationAllowedByApplicableRule: true,
      createsNewCapacityOrMaterialChange: true, evidenceShowsRequirementFailed: true,
    }).status).toBe("NO_CUMPLE");
  });

  it("does not infer that a fact existed before the deadline", () => {
    expect(assessEcpFinding({
      ...base, offerEvidence: [{ ...offer, existedByOfferDeadline: false }],
      defectKind: "FORMAL_OMISSION", convalidationAllowedByApplicableRule: true,
    }).status).toBe("NO_CONCLUYENTE");
  });

  it("requires page/section or an excerpt to trace evidence", () => {
    expect(assessEcpFinding({
      ...base, offerEvidence: [{ ...offer, pageOrSection: undefined, excerpt: undefined }],
      evidenceShowsRequirementMet: true,
    }).status).toBe("NO_CONCLUYENTE");
  });

  it("does not decide a contradiction automatically", () => {
    expect(assessEcpFinding({ ...base, defectKind: "CONTRADICTION" }).status).toBe("NO_CONCLUYENTE");
  });
});
