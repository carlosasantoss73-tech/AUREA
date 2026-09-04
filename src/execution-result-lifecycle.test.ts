import { describe, expect, it } from "vitest";
import { ExecutionResultLifecycle } from "./execution-result-lifecycle.js";
import { ExecutionResultQA } from "./execution-result-qa.js";
import { WorkCell } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

const cell: WorkCell = {
  workCellId: "WC-LIFE-001",
  projectId: "P-001",
  companyId: "C-001",
  objective: "Run controlled operation",
  owner: "owner",
  planner: "planner",
  agents: ["agent-1"],
  dependencies: [],
  restrictions: [],
  state: "RUNNING",
  deliverables: [],
  evidence: ["EXECUTION_AUTHORIZED"],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
};

const success = {
  status: "SUCCEEDED" as const,
  traceId: "trace-life-001",
  providerId: "provider-1",
  modelId: "model-1",
  output: { ok: true },
  evidence: ["PROVIDER_EXECUTED", "RESULT_CAPTURED"],
};

describe("ExecutionResultLifecycle", () => {
  it("moves a successful execution through QA to CLOSED only with PASS evidence", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const lifecycle = new ExecutionResultLifecycle(registry);

    const result = lifecycle.apply({
      workCellId: cell.workCellId,
      traceId: success.traceId,
      execution: success,
      validation: { qaStatus: "PASS", auditStatus: "PASS", evidence: ["OUTPUT_VALIDATED", "AUDIT_VERIFIED"] },
    });

    expect(result.status).toBe("CLOSED");
    expect(registry.get(cell.workCellId).state).toBe("CLOSED");
    expect(registry.get(cell.workCellId).qaStatus).toBe("PASS");
    expect(registry.get(cell.workCellId).auditStatus).toBe("PASS");
    expect(registry.history(cell.workCellId).map((x) => x.to)).toEqual(["QA", "COMPLETED", "CLOSED"]);
  });

  it("moves a durable replay through the same independent QA gate", () => {
    const registry = new WorkCellRegistry();
    registry.register({ ...cell, workCellId: "WC-REPLAY-001" });
    const lifecycle = new ExecutionResultLifecycle(registry);
    const validator = new ExecutionResultQA();
    const replay = { ...success, status: "REPLAYED" as const, evidence: [...success.evidence, "IDEMPOTENT_REPLAY:trace-life-001"] };

    const validation = validator.validate({
      result: replay,
      expectedTraceId: replay.traceId,
      expectedProviderId: replay.providerId,
      requiredEvidence: ["RESULT_CAPTURED", "IDEMPOTENT_REPLAY:trace-life-001"],
    });
    expect(validation.qaStatus).toBe("PASS");

    const result = lifecycle.apply({
      workCellId: "WC-REPLAY-001",
      traceId: replay.traceId,
      execution: replay,
      validation,
    });

    expect(result.status).toBe("CLOSED");
    expect(registry.get("WC-REPLAY-001").state).toBe("CLOSED");
  });

  it("stops at QA when validation is missing", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const lifecycle = new ExecutionResultLifecycle(registry);

    const result = lifecycle.apply({ workCellId: cell.workCellId, traceId: success.traceId, execution: success });

    expect(result.status).toBe("QA_PENDING");
    expect(registry.get(cell.workCellId).state).toBe("QA");
  });

  it("records execution failure and never enters QA", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const lifecycle = new ExecutionResultLifecycle(registry);

    const result = lifecycle.apply({
      workCellId: cell.workCellId,
      traceId: "trace-life-002",
      execution: { status: "FAILED", traceId: "trace-life-002", evidence: ["PROVIDER_ERROR"], error: "provider failed" },
    });

    expect(result.status).toBe("FAILED");
    expect(registry.get(cell.workCellId).state).toBe("FAILED");
    expect(registry.history(cell.workCellId).map((x) => x.to)).toEqual(["FAILED"]);
  });

  it("blocks stale result traces before changing Work Cell state", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const lifecycle = new ExecutionResultLifecycle(registry);

    expect(() => lifecycle.apply({
      workCellId: cell.workCellId,
      traceId: "trace-request",
      execution: { ...success, traceId: "trace-result" },
    })).toThrow("EXECUTION_TRACE_DIVERGENCE");

    expect(registry.get(cell.workCellId).state).toBe("RUNNING");
  });
});
