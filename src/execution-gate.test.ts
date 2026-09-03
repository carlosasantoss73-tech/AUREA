import { describe, expect, it } from "vitest";
import { AureaExecutionGate } from "./execution-gate.js";
import { HealthLedger } from "./health-ledger.js";
import { AureaSentinel } from "./sentinel.js";
import { WorkCell } from "./work-cell.js";

const readyCell: WorkCell = {
  workCellId: "WC-EXEC-001", projectId: "PRJ-001", companyId: "CO-001", objective: "Execute",
  owner: "AGT-001", planner: "PLN-001", agents: ["AGT-001"], dependencies: [], restrictions: [],
  state: "READY", deliverables: [], evidence: [], qaStatus: "PENDING", auditStatus: "PENDING",
};

const baseRequest = {
  traceId: "TRACE-EXEC-001", workCell: readyCell, actorId: "AGT-001", actorRole: "ROLE-001",
  capabilityId: "CAP-001", toolId: "TOOL-001", action: "execute", effectClass: "READ" as const,
  allowedProjects: ["PRJ-001"], allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
};

describe("AUREA execution gate", () => {
  it("moves a READY Work Cell to RUNNING only after authorization", () => {
    const ledger = new HealthLedger();
    const gate = new AureaExecutionGate(new AureaSentinel(ledger));
    const result = gate.authorize(baseRequest);

    expect(result.status).toBe("AUTHORIZED");
    expect(result.workCell.state).toBe("RUNNING");
    expect(result.permission.decision).toBe("ALLOW");
    expect(ledger.unresolved()).toHaveLength(0);
  });

  it("blocks execution when the Work Cell is not READY", () => {
    const ledger = new HealthLedger();
    const gate = new AureaExecutionGate(new AureaSentinel(ledger));
    const result = gate.authorize({ ...baseRequest, workCell: { ...readyCell, state: "PLANNING" } });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("WORK_CELL_NOT_READY:PLANNING");
    expect(ledger.unresolved()).toHaveLength(1);
  });

  it("blocks destructive execution without human approval", () => {
    const ledger = new HealthLedger();
    const gate = new AureaExecutionGate(new AureaSentinel(ledger));
    const result = gate.authorize({ ...baseRequest, effectClass: "DESTRUCTIVE" });

    expect(result.status).toBe("BLOCKED");
    expect(result.permission.decision).toBe("REQUIRE_APPROVAL");
    expect(ledger.unresolved()).toHaveLength(1);
  });
});
