import type { ExecutionRuntimeResult } from "./execution-runtime.js";
import type { QAAuditEvidence } from "./qa-audit-gate.js";

export interface ExecutionResultValidationRequest {
  result: ExecutionRuntimeResult;
  expectedTraceId: string;
  expectedProviderId: string;
  requiredEvidence?: string[];
}

export interface ExecutionResultValidation extends QAAuditEvidence {
  blockers: string[];
}

/**
 * Independent post-execution validator.
 * It does not execute, mutate runtime state, or close a Work Cell.
 */
export class ExecutionResultQA {
  validate(request: ExecutionResultValidationRequest): ExecutionResultValidation {
    const blockers: string[] = [];
    const evidence = [...request.result.evidence];

    if (request.result.status !== "SUCCEEDED") {
      blockers.push(`EXECUTION_NOT_SUCCEEDED:${request.result.status}`);
    }
    if (request.result.traceId !== request.expectedTraceId) {
      blockers.push("TRACE_ID_MISMATCH");
    }
    if (request.result.providerId !== request.expectedProviderId) {
      blockers.push("PROVIDER_ID_MISMATCH");
    }

    for (const required of request.requiredEvidence ?? []) {
      if (!evidence.includes(required)) blockers.push(`REQUIRED_EVIDENCE_MISSING:${required}`);
    }

    const passed = blockers.length === 0;
    if (passed) evidence.push("QA:EXECUTION_RESULT_VALIDATED");
    else evidence.push(...blockers.map(blocker => `QA_BLOCKER:${blocker}`));

    return {
      qaStatus: passed ? "PASS" : "FAIL",
      auditStatus: passed ? "PASS" : "FAIL",
      evidence: [...new Set(evidence)],
      blockers,
    };
  }
}
