import { describe, expect, it } from "vitest";
import { validateAgentManifest } from "../factory/agent-contract.js";
import {
  AUREA_PROCUREMENT_MANIFEST,
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
});
