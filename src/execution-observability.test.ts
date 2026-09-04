import { describe, expect, it } from "vitest";
import { completeExecutionTelemetry, InMemoryExecutionTelemetry } from "./execution-observability.js";

describe("execution observability", () => {
  it("records explicit execution metadata without inventing measurements", () => {
    const sink = new InMemoryExecutionTelemetry();
    const started = {
      traceId: "TRACE-OBS-001",
      projectId: "PRJ-001",
      workCellId: "WC-001",
      providerId: "provider-1",
      modelId: "model-1",
      status: "STARTED" as const,
      startedAt: "2026-09-04T04:00:00.000Z",
      evidence: ["EXECUTION_STARTED"],
    };

    sink.append(started);
    const completed = completeExecutionTelemetry(started, {
      status: "SUCCEEDED",
      completedAt: "2026-09-04T04:00:00.125Z",
      qaStatus: "PASS",
      evidence: ["RESULT_CAPTURED"],
    });
    sink.append(completed);

    const records = sink.list("TRACE-OBS-001");
    expect(records).toHaveLength(2);
    expect(records[1].latencyMs).toBe(125);
    expect(records[1].qaStatus).toBe("PASS");
    expect(records[1].inputTokens).toBeUndefined();
    expect(records[1].estimatedCost).toBeUndefined();
    expect(records[1].evidence).toEqual(["EXECUTION_STARTED", "RESULT_CAPTURED"]);
  });

  it("does not produce negative latency and preserves replay status", () => {
    const started = {
      traceId: "TRACE-OBS-002",
      status: "STARTED" as const,
      startedAt: "2026-09-04T04:00:01.000Z",
      evidence: [],
    };
    const completed = completeExecutionTelemetry(started, {
      status: "REPLAYED",
      completedAt: "2026-09-04T03:59:59.000Z",
      evidence: ["IDEMPOTENT_REPLAY:TRACE-OBS-002"],
    });

    expect(completed.status).toBe("REPLAYED");
    expect(completed.latencyMs).toBe(0);
    expect(completed.evidence).toContain("IDEMPOTENT_REPLAY:TRACE-OBS-002");
  });
});
