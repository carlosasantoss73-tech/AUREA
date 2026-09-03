import { describe, expect, it } from "vitest";
import { QAAuditGate } from "./qa-audit-gate";
import { WorkCell } from "./work-cell";

const baseCell: WorkCell = {
  workCellId: "WC-1",
  projectId: "P-1",
  companyId: "HOLDING",
  objective: "test",
  owner: "agent-1",
  planner: "planner-1",
  agents: ["agent-1"],
  contextPackId: "ctx-1",
  dependencies: [],
  restrictions: [],
  state: "COMPLETED",
  deliverables: ["result"],
  evidence: ["execution:pass"],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
};

describe("QAAuditGate", () => {
  it("allows closure only when both QA and audit pass", () => {
    const result = new QAAuditGate().evaluate(baseCell, {
      qaStatus: "PASS",
      auditStatus: "PASS",
      evidence: ["qa:pass", "audit:pass"],
    });
    expect(result.status).toBe("READY_TO_CLOSE");
    expect(result.blockers).toEqual([]);
  });

  it("blocks when either independent gate fails", () => {
    const result = new QAAuditGate().evaluate(baseCell, {
      qaStatus: "PASS",
      auditStatus: "FAIL",
      evidence: ["qa:pass", "audit:fail"],
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("AUDIT_FAILED");
  });
});
