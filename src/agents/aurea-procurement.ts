import type { AgentManifest } from "../factory/agent-contract.js";

export const AUREA_PROCUREMENT_MANIFEST: AgentManifest = {
  agentId: "aurea-procurement",
  version: "1.0.0",
  name: "AUREA Procurement",
  mission: "Analizar procesos de contratación pública de forma objetiva, trazable y reproducible, sin inventar evidencia ni sustituir decisiones humanas.",
  scope: [
    "ingesta de expediente y documentos del proceso",
    "identificación de requisitos",
    "vinculación requisito-fuente-evidencia",
    "comparación objetiva de oferta frente a requisito",
    "clasificación de convalidabilidad",
    "matriz de hallazgos",
    "control de calidad y red team",
  ],
  limitations: [
    "no inventa evidencia",
    "no sustituye documentos oficiales no suministrados o verificados",
    "no convierte una inferencia en hecho",
    "no adjudica ni recomienda ganador",
    "no transforma una conclusión provisional en definitiva sin evidencia suficiente",
  ],
  inputs: [
    "procurement-process",
    "official-process-documents",
    "bidder-documents",
    "normative-sources",
  ],
  outputs: [
    "requirement-evidence-matrix",
    "findings",
    "convalidation-review",
    "quality-control-report",
    "red-team-report",
  ],
  knowledge: [
    "procurement-authoritative-sources",
    "process-specific-documents",
  ],
  rules: [
    "single-source-of-truth",
    "evidence-before-conclusion",
    "same-criteria-for-all-bidders",
    "no-post-offer-capacity-creation",
    "human-review-for-unresolved-findings",
  ],
  skills: [
    "procurement-document-analysis",
    "requirement-mapping",
    "evidence-traceability",
    "convalidation-analysis",
    "adversarial-review",
  ],
  tools: [
    "document-reader",
    "evidence-ledger",
    "deterministic-comparison-engine",
  ],
  workflows: [
    "procurement-audit",
    "requirement-by-requirement-evaluation",
    "red-team-review",
  ],
  deterministicTasks: [
    "exact-document-comparison",
    "deadline-and-amount-comparison",
    "presence-and-identity-checks",
  ],
  validators: [
    "source-validator",
    "evidence-validator",
    "consistency-validator",
    "convalidation-validator",
    "red-team-validator",
  ],
  testSuite: [
    "aurea-procurement-core",
    "procurement-regression",
  ],
  supportedAdapters: ["provider-neutral"],
  permissions: [
    "procurement:read",
    "procurement:analyze",
    "procurement:export",
  ],
  metrics: [
    "execution-time",
    "documents-processed",
    "requirements-evaluated",
    "unresolved-findings",
    "validation-failures",
  ],
  limits: {
    maxDocumentsPerRun: 1000,
    maxRequirementsPerRun: 5000,
  },
  lifecycle: "DEVELOPMENT",
};

export type ProcurementFindingState =
  | "CUMPLE"
  | "NO_CUMPLE"
  | "CONVALIDABLE"
  | "NO_APLICA"
  | "REVISION_HUMANA";

export interface ProcurementRequirement {
  id: string;
  description: string;
  source: string;
  mandatory: boolean;
}

export interface ProcurementEvidence {
  requirementId: string;
  documentId: string;
  location: string;
  excerpt: string;
}

export interface ProcurementFinding {
  requirementId: string;
  state: ProcurementFindingState;
  evidence: ProcurementEvidence[];
  reasoning: string;
  correction?: string;
}

export const PROCUREMENT_EVALUATION_SEQUENCE = [
  "REQUISITO",
  "FUENTE",
  "EVIDENCIA",
  "DOCUMENTO/PAGINA",
  "COMPARACION",
  "CONVALIDABILIDAD",
  "CONCLUSION",
] as const;


import {
  DeterministicEvaluationEngine,
  type EvaluationComparison,
  type EvaluationEvidence,
  type EvaluationRequirement,
  type EvaluationState,
} from "../factory/evaluation-engine.js";

const PROCUREMENT_STATE_MAP: Record<EvaluationState, ProcurementFindingState> = {
  COMPLIANT: "CUMPLE",
  NON_COMPLIANT: "NO_CUMPLE",
  CONVALIDABLE: "CONVALIDABLE",
  NOT_APPLICABLE: "NO_APLICA",
  HUMAN_REVIEW: "REVISION_HUMANA",
};

export function evaluateProcurementRequirements(
  requirements: ProcurementRequirement[],
  evidence: ProcurementEvidence[],
  compare: (
    requirement: ProcurementRequirement,
    evidence: ProcurementEvidence[],
  ) => EvaluationComparison,
): ProcurementFinding[] {
  const engine = new DeterministicEvaluationEngine();

  const evaluationRequirements: EvaluationRequirement[] = requirements.map(requirement => ({
    id: requirement.id,
    description: requirement.description,
    mandatory: requirement.mandatory,
  }));

  const evaluationEvidence: EvaluationEvidence[] = evidence.map((item, index) => ({
    id: item.documentId + ":" + item.location + ":" + index,
    requirementId: item.requirementId,
    source: item.documentId,
    documentId: item.documentId,
    location: item.location,
    value: item.excerpt,
    preExisting: item.preExisting,
  }));

  const result = engine.evaluate(
    { requirements: evaluationRequirements, evidence: evaluationEvidence },
    (requirement, usableEvidence) => {
      const procurementRequirement = requirements.find(item => item.id === requirement.id)!;
      const procurementEvidence = usableEvidence.map(item =>
        evidence.find(source =>
          source.requirementId === item.requirementId &&
          source.documentId === item.documentId &&
          source.location === item.location &&
          source.excerpt === item.value,
        )!,
      );
      return compare(procurementRequirement, procurementEvidence);
    },
  );

  return result.comparisons.map(comparison => ({
    requirementId: comparison.requirementId,
    state: PROCUREMENT_STATE_MAP[comparison.state],
    evidence: evidence.filter(item =>
      comparison.evidenceIds.some(id =>
        id.startsWith(item.documentId + ":" + item.location + ":"),
      ),
    ),
    reasoning: comparison.rationale,
    correction: comparison.correction,
  }));
}
