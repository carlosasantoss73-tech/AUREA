import { describe, expect, it } from "vitest";
import { canCloseWorkCell, closeWorkCell, WorkCell } from "./work-cell.js";

const base: WorkCell = {
  workCellId: "WC-001", projectId: "PRJ-001", companyId: "CO-001", objective: "Test",
  owner: "AGT-001", planner: "PLN-001", agents: ["AGT-001"], dependencies: [], restrictions: [],
  state: "COMPLETED", deliverables: ["D1"], evidence: ["E1"], qaStatus: "PASS", auditStatus: "PASS",
};

describe("WorkCell", () => {
  it("closes only after QA, audit and evidence gates pass", () => {
    expect(canCloseWorkCell(base)).toBe(true);
    expect(closeWorkCell(base).state).toBe("CLOSED");
  });

  it("blocks closure when QA fails", () => {
    expect(() => closeWorkCell({ ...base, qaStatus: "FAIL" })).toThrow("WORK_CELL_CLOSURE_GATE_FAILED");
  });
});
