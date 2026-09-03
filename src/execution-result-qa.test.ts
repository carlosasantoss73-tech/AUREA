import { describe, expect, it } from "vitest";
import { ExecutionResultQA } from "./execution-result-qa.js";
import type { ExecutionRuntimeResult } from "./execution-runtime.js";

describe("ExecutionResultQA", () => {
  const validator = new ExecutionResultQA();

  it("passes a successful result with matching trace/provider and evidence", () => {
    const result: ExecutionRuntimeResult = {
      status: "SUCCEEDED",
      traceId: "trace-1",
      providerId: "provider-test",
      modelId: "model-test",
      output: "ok",
      evidence: ["ADAPTER:EXECUTED"],
    };

    const validation = validator.validate({
      result,
      expectedTraceId: "trace-1",
      expectedProviderId: "provider-test",
      requiredEvidence: ["ADAPTER:EXECUTED"],
    });

    expect(validation.qaStatus).toBe("PASS");
    expect(validation.auditStatus).toBe("PASS");
    expect(validation.blockers).toEqual([]);
    expect(validation.evidence).toContain("QA:EXECUTION_RESULT_VALIDATED");
  });

  it("fails closed on trace/provider mismatch and missing evidence", () => {
    const result: ExecutionRuntimeResult = {
      status: "SUCCEEDED",
      traceId: "trace-wrong",
      providerId: "provider-wrong",
      output: "ok",
      evidence: [],
    };

    const validation = validator.validate({
      result,
      expectedTraceId: "trace-1",
      expectedProviderId: "provider-test",
      requiredEvidence: ["ADAPTER:EXECUTED"],
    });

    expect(validation.qaStatus).toBe("FAIL");
    expect(validation.auditStatus).toBe("FAIL");
    expect(validation.blockers).toEqual([
      "TRACE_ID_MISMATCH",
      "PROVIDER_ID_MISMATCH",
      "REQUIRED_EVIDENCE_MISSING:ADAPTER:EXECUTED",
    ]);
  });

  it("does not treat a failed execution as QA success", () => {
    const result: ExecutionRuntimeResult = {
      status: "FAILED",
      traceId: "trace-1",
      providerId: "provider-test",
      error: "adapter failed",
      evidence: ["ADAPTER:STARTED"],
    };

    const validation = validator.validate({
      result,
      expectedTraceId: "trace-1",
      expectedProviderId: "provider-test",
    });

    expect(validation.qaStatus).toBe("FAIL");
    expect(validation.blockers).toContain("EXECUTION_NOT_SUCCEEDED:FAILED");
  });
});
