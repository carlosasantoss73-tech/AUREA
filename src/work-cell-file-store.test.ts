import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkCellFileStore } from "./work-cell-file-store.js";
import type { WorkCell } from "./work-cell.js";
import type { WorkCellTransition } from "./work-cell-registry.js";

const cell: WorkCell = {
  workCellId: "WC-REC-001",
  projectId: "P-REC-001",
  companyId: "C-001",
  objective: "Recover durable state",
  owner: "owner",
  planner: "planner",
  agents: ["agent-1"],
  dependencies: [],
  restrictions: [],
  state: "QA",
  deliverables: ["result"],
  evidence: ["EXECUTION_SUCCEEDED", "QA_STARTED"],
  qaStatus: "PASS",
  auditStatus: "PENDING",
};

const transition: WorkCellTransition = {
  workCellId: cell.workCellId,
  from: "RUNNING",
  to: "QA",
  traceId: "trace-rec-001",
  evidence: ["EXECUTION_SUCCEEDED"],
  timestamp: new Date().toISOString(),
};

describe("WorkCellFileStore", () => {
  it("persists snapshots and transitions and recovers them after a new store instance", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurea-work-cell-"));
    const path = join(directory, "work-cells.json");
    const store = new WorkCellFileStore(path);

    await store.saveSnapshot(cell);
    await store.saveTransition(transition);

    const recovered = new WorkCellFileStore(path);
    await expect(recovered.recover(cell.workCellId)).resolves.toEqual(cell);
    await expect(recovered.getTransitions(cell.workCellId)).resolves.toEqual([transition]);

    const persisted = JSON.parse(await readFile(path, "utf8")) as { cells: Record<string, WorkCell> };
    expect(persisted.cells[cell.workCellId].state).toBe("QA");
  });

  it("returns undefined for unknown cells without creating state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurea-work-cell-"));
    const store = new WorkCellFileStore(join(directory, "work-cells.json"));
    await expect(store.recover("UNKNOWN")).resolves.toBeUndefined();
  });
});
