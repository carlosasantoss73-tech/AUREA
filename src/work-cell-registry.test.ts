import { describe, expect, it } from "vitest";
import { WorkCellRegistry } from "./work-cell-registry.js";
import { WorkCell } from "./work-cell.js";

const cell: WorkCell = {
  workCellId: "WC-001",
  projectId: "P-001",
  companyId: "HOLDING",
  objective: "Validate lifecycle persistence boundary",
  owner: "owner",
  planner: "planner",
  agents: ["agent-a"],
  dependencies: [],
  restrictions: [],
  state: "READY",
  deliverables: [],
  evidence: [],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
};

describe("WorkCellRegistry", () => {
  it("persists authorized lifecycle transitions and evidence", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);

    const running = registry.transition("WC-001", "RUNNING", "trace-001", ["EXECUTION_GATE_PASS"]);

    expect(running.state).toBe("RUNNING");
    expect(running.evidence).toContain("EXECUTION_GATE_PASS");
    expect(registry.get("WC-001").state).toBe("RUNNING");
    expect(registry.history("WC-001")[0]).toMatchObject({
      from: "READY",
      to: "RUNNING",
      traceId: "trace-001",
    });
  });

  it("fails closed on invalid transitions and missing evidence", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);

    expect(() => registry.transition("WC-001", "CLOSED", "trace-002", ["bad"])).toThrow(
      "INVALID_WORK_CELL_TRANSITION:READY->CLOSED",
    );
    expect(() => registry.transition("WC-001", "RUNNING", "trace-003", [])).toThrow(
      "TRANSITION_EVIDENCE_REQUIRED",
    );
  });

  it("does not expose mutable internal state", () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const retrieved = registry.get("WC-001");
    retrieved.agents.push("mutated");

    expect(registry.get("WC-001").agents).toEqual(["agent-a"]);
  });
});
