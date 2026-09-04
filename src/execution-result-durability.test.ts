import { describe, expect, it, vi } from "vitest";
import { ExecutionRuntime, ExecutionAdapter } from "./execution-runtime.js";
import { InMemoryExecutionResultStore, ExecutionResultStore } from "./execution-result-store.js";
import type { RuntimeAdmissionResult } from "./runtime-admission.js";
import type { ProviderRuntimeAdapter } from "./provider-runtime.js";

const provider: ProviderRuntimeAdapter = {
  providerId: "provider-test",
  modelId: "model-test",
  status: "EXECUTABLE",
  capabilities: ["text"],
  healthEvidence: ["HEALTHY"],
};

const admission: RuntimeAdmissionResult = {
  status: "ADMITTED",
  blockers: [],
  evidence: ["TRACE:trace-durable-1", "PLATFORM:HEALTHY", "CONTEXT:READY"],
  contextStatus: "READY",
  providerId: provider.providerId,
  execution: {
    status: "AUTHORIZED",
    workCell: {
      workCellId: "wc-durable-1",
      projectId: "p-durable-1",
      companyId: "holding",
      objective: "durable test",
      owner: "owner",
      planner: "planner",
      agents: [],
      dependencies: [],
      restrictions: [],
      state: "RUNNING",
      deliverables: [],
      evidence: ["AUTH"],
      qaStatus: "PENDING",
      auditStatus: "PENDING",
    },
    permission: { decision: "ALLOW", reason: "OK", traceId: "trace-durable-1" },
    blockers: [],
    evidence: ["PERMISSION:ALLOW"],
  },
};

describe("ExecutionRuntime durable result boundary", () => {
  it("replays a completed result after runtime restart", async () => {
    const store = new InMemoryExecutionResultStore();
    const first = new ExecutionRuntime(store);
    const firstExecute = vi.fn(async () => ({ output: "once", evidence: ["ADAPTER:EXECUTED"] }));
    first.registerAdapter({ providerId: provider.providerId, execute: firstExecute });

    const firstResult = await first.execute({ admission, provider, input: { prompt: "hello" } });

    const restarted = new ExecutionRuntime(store);
    const secondExecute = vi.fn(async () => ({ output: "must-not-run", evidence: ["DUPLICATE"] }));
    restarted.registerAdapter({ providerId: provider.providerId, execute: secondExecute });
    const replay = await restarted.execute({ admission, provider, input: { prompt: "hello" } });

    expect(firstResult.status).toBe("SUCCEEDED");
    expect(replay.status).toBe("REPLAYED");
    expect(replay.replayOfTraceId).toBe("trace-durable-1");
    expect(firstExecute).toHaveBeenCalledOnce();
    expect(secondExecute).not.toHaveBeenCalled();
  });

  it("fails closed before provider execution when the result store cannot load", async () => {
    const store: ExecutionResultStore = {
      loadState: vi.fn(async () => { throw new Error("STORE_UNAVAILABLE"); }),
      reserve: vi.fn(async () => "RESERVED" as const),
      commitCompleted: vi.fn(async () => undefined),
      releaseReservation: vi.fn(async () => undefined),
    };
    const runtime = new ExecutionRuntime(store);
    const execute = vi.fn(async () => ({ output: "must-not-run", evidence: ["BAD"] }));
    runtime.registerAdapter({ providerId: provider.providerId, execute });

    const result = await runtime.execute({ admission, provider, input: {} });

    expect(result.status).toBe("BLOCKED");
    expect(result.error).toBe("EXECUTION_IDEMPOTENCY_STORE_UNAVAILABLE");
    expect(execute).not.toHaveBeenCalled();
  });

  it("retains the reservation when durable commit fails, blocking duplicate execution", async () => {
    const store: ExecutionResultStore = {
      loadState: vi.fn(async () => ({ completed: [], reservedTraceIds: [] })),
      reserve: vi.fn(async () => "RESERVED" as const),
      commitCompleted: vi.fn(async () => { throw new Error("STORE_WRITE_FAILED"); }),
      releaseReservation: vi.fn(async () => undefined),
    };
    const runtime = new ExecutionRuntime(store);
    const execute = vi.fn(async () => ({ output: "executed", evidence: ["ADAPTER:EXECUTED"] }));
    runtime.registerAdapter({ providerId: provider.providerId, execute });

    const result = await runtime.execute({ admission, provider, input: {} });
    const retry = await runtime.execute({ admission, provider, input: {} });

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("STORE_WRITE_FAILED");
    expect(result.evidence).toContain("RESULT_NOT_DURABLY_PERSISTED");
    expect(retry.status).toBe("BLOCKED");
    expect(retry.error).toBe("EXECUTION_IDEMPOTENCY_RESERVATION_EXISTS");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("releases the reservation after provider failure so a controlled retry is possible", async () => {
    const store = new InMemoryExecutionResultStore();
    const runtime = new ExecutionRuntime(store);
    const execute = vi.fn()
      .mockRejectedValueOnce(new Error("TRANSIENT_PROVIDER_FAILURE"))
      .mockResolvedValueOnce({ output: "recovered", evidence: ["ADAPTER:RECOVERED"] });
    runtime.registerAdapter({ providerId: provider.providerId, execute });

    const first = await runtime.execute({ admission, provider, input: {} });
    const second = await runtime.execute({ admission, provider, input: {} });

    expect(first.status).toBe("FAILED");
    expect(second.status).toBe("SUCCEEDED");
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
