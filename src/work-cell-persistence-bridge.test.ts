import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkCellFileStore } from "./work-cell-file-store.js";
import { WorkCellPersistenceBridge } from "./work-cell-persistence-bridge.js";
import { WorkCellRegistry } from "./work-cell-registry.js";
import type { WorkCell } from "./work-cell.js";

const cell = (id = "wc-recovery-1"): WorkCell => ({
  workCellId: id,
  projectId: "project-1",
  companyId: "company-1",
  objective: "Persist and recover a Work Cell",
  owner: "owner-1",
  planner: "planner-1",
  agents: ["agent-1"],
  dependencies: [],
  restrictions: [],
  state: "READY",
  deliverables: [],
  evidence: ["created-for-test"],
  qaStatus: "PENDING",
  auditStatus: "PENDING",
});

describe("WorkCellPersistenceBridge", () => {
  it("persists authoritative state and lifecycle history, then recovers it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-wc-"));
    try {
      const store = new WorkCellFileStore(join(dir, "work-cells.json"));
      const registry = new WorkCellRegistry();
      registry.register(cell());
      registry.transition("wc-recovery-1", "RUNNING", "trace-run-1", ["authorized"]);

      await new WorkCellPersistenceBridge(registry, store).persist();

      const recovered = new WorkCellRegistry();
      const bridge = new WorkCellPersistenceBridge(recovered, store);
      expect(await bridge.recover()).toBe(1);
      expect(recovered.get("wc-recovery-1").state).toBe("RUNNING");
      expect(recovered.history("wc-recovery-1")).toHaveLength(1);
      expect(recovered.history("wc-recovery-1")[0].traceId).toBe("trace-run-1");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails closed when persisted history references an unknown Work Cell", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-wc-"));
    try {
      const store = new WorkCellFileStore(join(dir, "work-cells.json"));
      await store.saveState({
        cells: {},
        transitions: [{
          workCellId: "missing",
          from: "READY",
          to: "RUNNING",
          traceId: "trace-invalid",
          evidence: ["evidence"],
          timestamp: new Date().toISOString(),
        }],
      });
      const registry = new WorkCellRegistry();
      await expect(new WorkCellPersistenceBridge(registry, store).recover())
        .rejects.toThrow("TRANSITION_WITHOUT_WORK_CELL:missing");
      expect(registry.list()).toHaveLength(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
