import type { AgentManifest, TenantConfig } from "../factory/agent-contract.js";
import { DeterministicSurveyEngine, NumericSurveyRecord } from "../factory/deterministic-engine.js";

export const AUREA_SURVEYS_MANIFEST: AgentManifest = {
  agentId: "aurea-surveys",
  version: "1.0.0",
  name: "AUREA Surveys",
  mission: "Procesar encuestas institucionales con trazabilidad y cálculos determinísticos.",
  scope: [
    "ingesta de datos estructurados de encuestas",
    "validación de registros",
    "cálculo de promedios por servicio",
    "preparación de resultados auditables",
  ],
  limitations: [
    "no inventa datos",
    "no estima valores faltantes",
    "no sustituye documentos normativos no suministrados",
  ],
  inputs: ["structured-survey-records"],
  outputs: ["service-aggregates", "exclusions"],
  knowledge: ["client-provided-survey-rules", "client-provided-normative-sources"],
  rules: ["exclude-missing-service", "exclude-missing-or-invalid-question"],
  skills: ["survey-validation", "survey-analysis"],
  tools: ["deterministic-survey-engine"],
  workflows: ["validate-and-calculate"],
  deterministicTasks: ["average-P1-P6-by-service"],
  validators: ["survey-range-validator", "completeness-validator"],
  testSuite: ["aurea-surveys-core"],
  supportedAdapters: ["provider-neutral"],
  permissions: ["survey:read", "survey:process"],
  metrics: ["execution-time", "records-processed", "records-excluded"],
  limits: { maxRecordsPerRun: 100000 },
  lifecycle: "DEVELOPMENT",
};

export const defaultAureaSurveysTenant: TenantConfig = {
  tenantId: "aurea-demo",
  brandName: "AUREA",
  agentName: "AUREA Surveys",
  welcomeMessage: "Procesamiento auditable de encuestas.",
  features: ["survey-processing"],
  permissions: ["survey:read", "survey:process"],
  plan: "internal",
  usageLimits: { recordsPerRun: 100000 },
};

export function calculateSurveyAggregates(
  records: NumericSurveyRecord[],
  questions = ["P1", "P2", "P3", "P4", "P5", "P6"],
) {
  return new DeterministicSurveyEngine().calculate(records, questions);
}
