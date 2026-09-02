import { describe, expect, it } from "vitest";
import { WorkPlanner } from "./work-planner";

describe("AUREA pre-build work planner", () => {
  it("reuses validated assets instead of creating duplicates", async () => {
    const queries: string[] = [];
    const planner = new WorkPlanner({
      async searchAssets(query) {
        queries.push(query);
        return [{
          id: "knowledge-os",
          name: "Knowledge OS",
          source: "KNOWLEDGE_OS",
          status: "VALIDATED",
          capabilities: ["memory", "provenance"],
        }];
      },
    });

    const plan = await planner.plan({
      projectId: "sales-ai",
      objective: "Crear profesional digital comercial",
      requestedWork: ["memoria institucional"],
    });

    expect(queries).toEqual(["memoria institucional"]);
    expect(plan.status).toBe("READY");
    expect(plan.items[0].treatment).toBe("REUSE");
    expect(plan.items[0].reuseAssetIds).toEqual(["knowledge-os"]);
  });

  it("does not pretend a historical asset is operational", async () => {
    const planner = new WorkPlanner({
      async searchAssets() {
        return [{
          id: "conchita-history",
          name: "Conchita histórico",
          source: "HISTORICAL",
          status: "HISTORICAL",
          capabilities: ["orchestration"],
        }];
      },
    });

    const plan = await planner.plan({
      projectId: "sales-ai",
      objective: "orquestación",
      requestedWork: ["orquestador"],
    });

    expect(plan.status).toBe("READY");
    expect(plan.items[0].treatment).toBe("ADAPT");
    expect(plan.items[0].evidenceRequired).toContain("Validar implementación y vigencia antes de activar");
  });

  it("requires review when no reusable asset is found", async () => {
    const planner = new WorkPlanner({ async searchAssets: async () => [] });
    const plan = await planner.plan({
      projectId: "sales-ai",
      objective: "voz",
      requestedWork: ["voz conversacional avanzada"],
    });

    expect(plan.status).toBe("NEEDS_REVIEW");
    expect(plan.items[0].treatment).toBe("NEW");
    expect(plan.missingEvidence).toHaveLength(1);
  });
});
