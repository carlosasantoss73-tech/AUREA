import { describe, expect, it } from "vitest";
import { InMemoryExecutionResultStore } from "./execution-result-store.js";
import { WorkCellFileStore } from "./work-cell-file-store.js";
import { WorkCellPersistenceBridge } from "./work-cell-persistence-bridge.js";
import { RuntimeRecoveryContinuity } from "./runtime-recovery-continuity.js";
import { WorkCellRegistry } from "./work-cell-registry.js";
import type { WorkCell } from "./work-cell.js";

const cell: WorkCell = { workCellId: "WC-RECOVERY-001", projectId: "PRJ-RECOVERY", companyId: "CO-001", objective: "recovery", owner: "AGT-001", planner: "PLN-001", agents: ["AGT-001"], dependencies: [], restrictions: [], state: "RUNNING", deliverables: [], evidence: ["EXECUTION_STARTED"], qaStatus: "PENDING", auditStatus: "PENDING" };

function durableResult(traceId: string) { return { status: "SUCCEEDED" as const, traceId, providerId: "provider", modelId: "model", output: { ok: true }, evidence: ["RESULT_CAPTURED"] }; }

describe("RuntimeRecoveryContinuity", () => {
  it("restores Work Cell state and exposes durable result for replay", async () => {
    const source = new WorkCellRegistry(); source.register(cell);
    const store = new WorkCellFileStore("/tmp/aurea-recovery-test.json");
    const persistence = new WorkCellPersistenceBridge(source, store);
    const results = new InMemoryExecutionResultStore();
    await results.commitCompleted(durableResult("TRACE-RECOVERY-001"));
    await persistence.persist();

    const recovered = new WorkCellRegistry();
    const recovery = new RuntimeRecoveryContinuity(new WorkCellPersistenceBridge(recovered, store), recovered, results);
    const result = await recovery.recover({ workCellId: cell.workCellId, traceId: "TRACE-RECOVERY-001" });
    expect(result.status).toBe("REPLAY_AVAILABLE");
    expect(recovered.get(cell.workCellId).state).toBe("RUNNING");
    expect(result.durableResultFound).toBe(true);
    expect(result.evidence).toContain("REPLAY_REQUIRES_QA");
  });

  it("fails closed when durable state cannot be loaded", async () => {
    const registry = new WorkCellRegistry(); registry.register(cell);
    const failingStore = { loadState: async () => { throw new Error("STORE_UNAVAILABLE"); }, reserve: async () => "RESERVED" as const, commitCompleted: async () => {}, releaseReservation: async () => {} };
    const failingPersistence = { recover: async () => { throw new Error("WORK_CELL_STORE_UNAVAILABLE"); } };
    const recovery = new RuntimeRecoveryContinuity(failingPersistence, registry, failingStore);
    const result = await recovery.recover({ workCellId: cell.workCellId, traceId: "TRACE-RECOVERY-002" });
    expect(result.status).toBe("BLOCKED");
    expect(result.evidence).toContain("RECOVERY_FAILED_CLOSED");
  });
});
