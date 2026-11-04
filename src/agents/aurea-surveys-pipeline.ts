import type { TenantConfig } from "../factory/agent-contract.js";
import { EvidenceLedger } from "../factory/evidence.js";
import {
  DeterministicSurveyEngine,
  NumericSurveyRecord,
} from "../factory/deterministic-engine.js";

export interface SurveyPipelineInput {
  executionId: string;
  tenant: TenantConfig;
  records: NumericSurveyRecord[];
  questions?: string[];
}

export interface SurveyPipelineOutput {
  executionId: string;
  tenantId: string;
  status: "COMPLETED" | "BLOCKED";
  result?: ReturnType<DeterministicSurveyEngine["calculate"]>;
  evidence: ReturnType<EvidenceLedger["get"]>;
  blockers: string[];
}

/**
 * Provider-neutral first vertical slice.
 * PDF/document extraction is deliberately outside this deterministic boundary.
 */
export function runAureaSurveysPipeline(input: SurveyPipelineInput): SurveyPipelineOutput {
  const ledger = new EvidenceLedger();
  const questions = input.questions ?? ["P1", "P2", "P3", "P4", "P5", "P6"];
  const engine = new DeterministicSurveyEngine();

  if (!input.executionId) {
    return {
      executionId: input.executionId,
      tenantId: input.tenant.tenantId,
      status: "BLOCKED",
      blockers: ["MISSING_EXECUTION_ID"],
      evidence: ledger.get(input.executionId),
    };
  }

  if (input.records.length > input.tenant.usageLimits.recordsPerRun) {
    return {
      executionId: input.executionId,
      tenantId: input.tenant.tenantId,
      status: "BLOCKED",
      blockers: ["RECORD_LIMIT_EXCEEDED"],
      evidence: ledger.get(input.executionId),
    };
  }

  ledger.add({
    id: `${input.executionId}:input`,
    executionId: input.executionId,
    kind: "SOURCE",
    source: "structured-survey-records",
    value: { records: input.records.length, questions },
    timestamp: new Date().toISOString(),
  });

  const result = engine.calculate(input.records, questions);

  ledger.add({
    id: `${input.executionId}:calculation`,
    executionId: input.executionId,
    kind: "CALCULATION",
    rule: "deterministic-survey-average-v1",
    value: result.aggregates,
    timestamp: new Date().toISOString(),
  });

  ledger.add({
    id: `${input.executionId}:validation`,
    executionId: input.executionId,
    kind: "VALIDATION",
    rule: "exclude-missing-or-invalid-question",
    value: { excluded: result.excluded.length },
    timestamp: new Date().toISOString(),
  });

  ledger.add({
    id: `${input.executionId}:result`,
    executionId: input.executionId,
    kind: "RESULT",
    value: result,
    timestamp: new Date().toISOString(),
  });

  return {
    executionId: input.executionId,
    tenantId: input.tenant.tenantId,
    status: "COMPLETED",
    result,
    evidence: ledger.get(input.executionId),
    blockers: [],
  };
}
