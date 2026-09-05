import { describe, expect, it } from "vitest";
import { EventDrivenRuntime, InMemoryEventStore, RuntimeEvent } from "./event-driven-runtime.js";
import { RecoveryRuntimeBridge } from "./recovery-runtime-bridge.js";
import { WorkCell } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

const cell = (state: WorkCell["state"]): WorkCell => ({
  workCellId: "cell-1",
  projectId: "project-1",
  companyId: "company-1",
  objective: "recover safely",
  owner: "owner-1",
  planner: "planner-1",
  agents: ["agent-1"],
  dependencies: [],
  restrictions: [],
  state,
  deliverables: [],
  evidence: ["CELL_CREATED"],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
});

const event = (eventType: RuntimeEvent["eventType"], eventId = "evt-1"): RuntimeEvent => ({
  eventId,
  eventType,
  traceId: "trace-1",
  projectId: "project-1",
  workCellId: "cell-1",
  occurredAt: "2026-09-04T17:00:00.000Z",
  payload: {},
});

const setup = (state: WorkCell["state"]) => {
  const registry = new WorkCellRegistry();
  registry.register(cell(state));
  const runtime = new EventDrivenRuntime(new InMemoryEventStore());
  const bridge = new RecoveryRuntimeBridge(runtime, registry);
  return { runtime, registry, bridge };
};

describe("RecoveryRuntimeBridge", () => {
  it("resumes an interrupted WAITING cell without bypassing lifecycle rules", () => {
    const { runtime, registry } = setup("WAITING");

    const result = runtime.publish(event("EXECUTION_INTERRUPTED"));

    expect(result.accepted).toBe(true);
    expect(registry.get("cell-1").state).toBe("RUNNING");
  });

  it("moves an interrupted BLOCKED cell to PLANNING for governed recovery", () => {
    const { runtime, registry } = setup("BLOCKED");

    runtime.publish(event("EXECUTION_INTERRUPTED"));

    expect(registry.get("cell-1").state).toBe("PLANNING");
  });

  it("replans an explicitly failed cell instead of directly executing a retry", () => {
    const { runtime, registry } = setup("FAILED");

    runtime.publish(event("EXECUTION_FAILED"));

    expect(registry.get("cell-1").state).toBe("PLANNING");
  });

  it("fails closed when recovery has no safe lifecycle transition", () => {
    const { runtime, registry, bridge } = setup("READY");

    const result = bridge.handle(event("EXECUTION_INTERRUPTED"));

    expect(result.applied).toBe(false);
    expect(result.reason).toContain("NO_SAFE_TRANSITION");
    expect(registry.get("cell-1").state).toBe("READY");
  });

  it("preserves trace and evidence on an applied recovery transition", () => {
    const { runtime, registry } = setup("WAITING");

    runtime.publish(event("EXECUTION_INTERRUPTED", "evt-evidence"));

    const recovered = registry.get("cell-1");
    expect(recovered.evidence).toContain("RUNTIME_EVENT_ACCEPTED:evt-evidence");
    expect(recovered.evidence).toContain("RECOVERY_RESUME_APPLIED");
    expect(registry.history("cell-1")[0].traceId).toBe("trace-1");
  });
});
