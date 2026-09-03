import { describe, expect, it } from "vitest";
import { AureaOrchestrator } from "./aurea-orchestrator";

describe("AureaOrchestrator", () => {
  it("keeps independent commercial work ready in parallel", () => {
    const orchestrator = new AureaOrchestrator();
    const plan = orchestrator.plan("TCL", "Preparar campañas Ecuador y Chile", [
      { id: "preflight", name: "Preflight", stage: "PREFLIGHT", dependsOn: [], agent: "AUREA Preflight", status: "DONE" },
      { id: "ecuador", name: "Campaña Ecuador", stage: "STRATEGY", dependsOn: ["preflight"], agent: "Marketing Intelligence", status: "PENDING" },
      { id: "chile", name: "Campaña Chile", stage: "STRATEGY", dependsOn: ["preflight"], agent: "Marketing Intelligence", status: "PENDING" },
    ]);
    expect(plan.tasks.find(task => task.id === "ecuador")?.status).toBe("READY");
    expect(plan.tasks.find(task => task.id === "chile")?.status).toBe("READY");
  });
});
