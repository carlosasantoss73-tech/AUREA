import { describe, expect, it } from "vitest";
import { validateAgentManifest } from "../factory/agent-contract.js";
import type { EvaluationComparison } from "../factory/evaluation-engine.js";
import {
  AUREA_PROCUREMENT_MANIFEST,
  evaluateProcurementRequirements,
  PROCUREMENT_EVALUATION_SEQUENCE,
  type ProcurementFinding,
} from "./aurea-procurement.js";

describe("AUREA Procurement domain agent", () => {
  it("has a valid universal agent contract", () => {
    expect(validateAgentManifest(AUREA_PROCUREMENT_MANIFEST)).toEqual([]);
  });

  it("preserves the auditable evaluation sequence", () => {
    expect(PROCUREMENT_EVALUATION_SEQUENCE).toEqual([
      "REQUISITO",
      "FUENTE",
      "EVIDENCIA",
      "DOCUMENTO/PAGINA",
      "COMPARACION",
      "CONVALIDABILIDAD",
      "CONCLUSION",
    ]);
  });

  it("does not invent a conclusion without evidence", () => {
    const finding: ProcurementFinding = {
      requirementId: "REQ-001",
      state: "REVISION_HUMANA",
      evidence: [],
      reasoning: "No existe evidencia suficiente para concluir.",
    };

    expect(finding.evidence).toHaveLength(0);
    expect(finding.state).toBe("REVISION_HUMANA");
  });

  it("reuses the Factory evaluation engine and preserves procurement states", () => {
    const findings = evaluateProcurementRequirements(
      [{ id: "REQ-001", description: "Capacity", source: "TDR", mandatory: true }],
      [{ requirementId: "REQ-001", documentId: "DOC-1", location: "p. 2", excerpt: "Capacity: 10", preExisting: true }],
      (requirement, evidence): EvaluationComparison => ({
        requirementId: requirement.id,
        evidenceIds: evidence.map(item => "DOC-1:p. 2:0"),
        state: "CONVALIDABLE",
        rationale: "Formal defect with pre-existing evidence.",
      }),
    );

    expect(findings[0].state).toBe("CONVALIDABLE");
    expect(findings[0].evidence).toHaveLength(1);
  });

});
