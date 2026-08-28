import { describe, expect, it } from "vitest";
import { createAureaRuntime } from "./aurea-runtime-factory";

describe("AUREA canonical runtime factory", () => {
  it("enables historical retrieval by default", async () => {
    const runtime = createAureaRuntime();
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const result = await runtime.execute({
      actorId: "librarian", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ",
      allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
      contextQuery: "¿Qué herramientas de video trabajamos esta semana?", payload: { query: "video" }, dryRun: true,
    });
    expect(result.status).toBe("DRY_RUN");
    expect(result.context?.facts.some(f => f.includes("MoneyPrinterTurbo"))).toBe(true);
  });
});
