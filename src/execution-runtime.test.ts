import { describe, expect, it, vi } from "vitest";
import { ExecutionRuntime, ExecutionAdapter } from "./execution-runtime.js";
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
  evidence: ["TRACE:trace-1", "PLATFORM:HEALTHY", "CONTEXT:READY"],
  contextStatus: "READY",
  providerId: provider.providerId,
  execution: {
    status: "AUTHORIZED",
    workCell: {
      workCellId: "wc-1",
      projectId: "p-1",
      companyId: "holding",
      objective: "test",
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
    permission: { decision: "ALLOW", reason: "OK", traceId: "trace-1" },
    blockers: [],
    evidence: ["PERMISSION:ALLOW"],
  },
};

describe("ExecutionRuntime", () => {
  it("executes only an admitted and authorized request", async () => {
    const runtime = new ExecutionRuntime();
    const adapter: ExecutionAdapter = {
      providerId: provider.providerId,
      execute: vi.fn(async () => ({ output: "ok", evidence: ["ADAPTER:EXECUTED"] })),
    };
    runtime.registerAdapter(adapter);

    const result = await runtime.execute({ admission, provider, input: { prompt: "hello" } });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.output).toBe("ok");
    expect(result.modelId).toBe("model-test");
    expect(result.evidence).toContain("ADAPTER:EXECUTED");
    expect(adapter.execute).toHaveBeenCalledOnce();
  });

  it("fails closed when the adapter is missing", async () => {
    const runtime = new ExecutionRuntime();
    const result = await runtime.execute({ admission, provider, input: {} });

    expect(result.status).toBe("BLOCKED");
    expect(result.error).toBe("EXECUTION_ADAPTER_NOT_REGISTERED:provider-test");
  });

  it("does not execute a blocked admission", async () => {
    const runtime = new ExecutionRuntime();
    const execute = vi.fn(async () => ({ output: "must-not-run", evidence: ["BAD"] }));
    runtime.registerAdapter({ providerId: provider.providerId, execute });

    const blocked: RuntimeAdmissionResult = {
      ...admission,
      status: "BLOCKED",
      blockers: ["PERMISSION_DENIED"],
    };

    const result = await runtime.execute({ admission: blocked, provider, input: {} });

    expect(result.status).toBe("BLOCKED");
    expect(execute).not.toHaveBeenCalled();
  });

  it("fails closed when the adapter returns no evidence", async () => {
    const runtime = new ExecutionRuntime();
    runtime.registerAdapter({
      providerId: provider.providerId,
      execute: vi.fn(async () => ({ output: "ok", evidence: [] })),
    });

    const result = await runtime.execute({ admission, provider, input: {} });

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("EXECUTION_RESULT_EVIDENCE_REQUIRED");
  });

  it("prevents duplicate execution for the same trace", async () => {
    const runtime = new ExecutionRuntime();
    const execute = vi.fn(async () => ({ output: "once", evidence: ["ONCE"] }));
    runtime.registerAdapter({ providerId: provider.providerId, execute });

    const first = await runtime.execute({ admission, provider, input: {} });
    const second = await runtime.execute({ admission, provider, input: {} });

    expect(first.status).toBe("SUCCEEDED");
    expect(second.status).toBe("REPLAYED");
    expect(execute).toHaveBeenCalledOnce();
  });
});
