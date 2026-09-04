import { describe, expect, it, vi } from "vitest";
import { ExecutionStateBridge } from "./execution-state-bridge.js";
import { WorkCell } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

const cell: WorkCell = {
  workCellId: "WC-001",
  projectId: "P-001",
  companyId: "C-001",
  objective: "Execute approved operation",
  owner: "owner",
  planner: "planner",
  agents: ["agent-1"],
  dependencies: [],
  restrictions: [],
  state: "READY",
  deliverables: [],
  evidence: ["PLAN_READY"],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
};

function gate(status: "AUTHORIZED" | "BLOCKED", workCell: WorkCell = cell) {
  return {
    authorize: vi.fn(() => ({
      status,
      workCell: status === "AUTHORIZED" ? { ...workCell, state: "RUNNING" } : workCell,
      permission: { decision: status === "AUTHORIZED" ? "ALLOW" as const : "DENY" as const, reason: status, traceId: "trace-001" },
      blockers: status === "BLOCKED" ? ["DENIED"] : [],
      evidence: ["GATE_EVALUATED"],
    })),
  } as unknown as import("./execution-gate.js").AureaExecutionGate;
}

describe("ExecutionStateBridge", () => {
  it("commits READY -> RUNNING only after authorization", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const bridge = new ExecutionStateBridge(gate("AUTHORIZED"), registry);

    const result = bridge.authorizeAndCommit({
      traceId: "trace-001",
      workCell: cell,
      actorId: "actor-1",
      actorRole: "operator",
      capabilityId: "capability-1",
      toolId: "tool-1",
      action: "execute",
      effectClass: "WRITE",
    });

    expect(result.status).toBe("AUTHORIZED");
    expect(result.stateCommitted).toBe(true);
    expect(registry.get("WC-001").state).toBe("RUNNING");
    expect(registry.history("WC-001")[0]).toMatchObject({
      from: "READY",
      to: "RUNNING",
      traceId: "trace-001",
    });
  });

  it("does not commit state when authorization is blocked", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const bridge = new ExecutionStateBridge(gate("BLOCKED"), registry);

    const result = bridge.authorizeAndCommit({
      traceId: "trace-002",
      workCell: cell,
      actorId: "actor-1",
      actorRole: "operator",
      capabilityId: "capability-1",
      toolId: "tool-1",
      action: "execute",
      effectClass: "WRITE",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.stateCommitted).toBe(false);
    expect(registry.get("WC-001").state).toBe("READY");
    expect(registry.history("WC-001")).toHaveLength(0);
  });

  it("fails closed on state divergence instead of committing a stale request", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    registry.transition("WC-001", "BLOCKED", "trace-pre", ["CONTEXT_BLOCKED"]);
    const bridge = new ExecutionStateBridge(gate("AUTHORIZED"), registry);

    expect(() => bridge.authorizeAndCommit({
      traceId: "trace-003",
      workCell: cell,
      actorId: "actor-1",
      actorRole: "operator",
      capabilityId: "capability-1",
      toolId: "tool-1",
      action: "execute",
      effectClass: "WRITE",
    })).toThrow("WORK_CELL_STATE_DIVERGENCE");

    expect(registry.get("WC-001").state).toBe("BLOCKED");
  });
});
