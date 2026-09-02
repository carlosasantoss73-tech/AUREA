import { describe, expect, it } from "vitest";
import { InMemoryOperationsStore, OperationsCenter } from "./operations-center";
import { PreflightOperations } from "./preflight-operations";
import { WorkPlanner } from "./work-planner";

describe("AUREA Preflight + Operations Center", () => {
  it("runs Preflight inside a project and persists the first checkpoint", async () => {
    const store = new InMemoryOperationsStore();
    const center = new OperationsCenter(store);
    const planner = new WorkPlanner({
      searchAssets: async task => task === "memory" ? [{
        id: "memory-v1",
        name: "Conversation Memory",
        source: "REPOSITORY",
        status: "VALIDATED",
        capabilities: ["memory"],
      }] : [],
    });
    const preflight = new PreflightOperations(planner, center);

    const result = await preflight.start({
      projectId: "sales-ai",
      projectName: "AUREA Sales AI",
      objective: "Preparar el MVP comercial",
      requestedWork: ["memory"],
      sessionId: "session-001",
    }, "2026-09-01T10:00:00.000Z");

    expect(result.plan.status).toBe("READY");
    expect(result.plan.items[0].treatment).toBe("REUSE");
    expect(result.checkpoint.projectId).toBe("sales-ai");
    expect(result.checkpoint.decisions).toEqual(["memory: REUSE"]);
    expect(result.checkpoint.nextAction).toBe("Iniciar ejecución del WorkPlan");
    expect(await store.getLatestCheckpoint("sales-ai")).toEqual(result.checkpoint);
  });

  it("pauses the project when Preflight requires evidence", async () => {
    const store = new InMemoryOperationsStore();
    const preflight = new PreflightOperations(
      new WorkPlanner({ searchAssets: () => Promise.resolve([]) }),
      new OperationsCenter(store),
    );

    const result = await preflight.start({
      projectId: "new-project",
      projectName: "Nuevo proyecto",
      objective: "Resolver una necesidad nueva",
      requestedWork: ["new capability"],
      sessionId: "session-002",
    }, "2026-09-01T11:00:00.000Z");

    expect(result.plan.status).toBe("NEEDS_REVIEW");
    expect(result.checkpoint.state).toBe("PAUSED");
    expect(result.checkpoint.pending).toHaveLength(1);
    expect(result.checkpoint.nextAction).toBe("Resolver evidencia pendiente antes de construir");
  });
});
