import { describe, expect, it } from "vitest";
import { createAureaRuntime } from "./aurea-runtime-factory";

describe("AUREA canonical runtime continuity", () => {
  it("fails closed when only local continuity seeds are available", async () => {
    const runtime = createAureaRuntime();
    runtime.registerTool({
      toolId: "knowledge.search",
      effectClass: "READ",
      execute: payload => payload,
    });
    const result = await runtime.execute({
      actorId: "aureo",
      actorRole: "system",
      projectId: "aurea",
      capabilityId: "knowledge.read",
      toolId: "knowledge.search",
      action: "search",
      effectClass: "READ",
      allowedProjects: ["aurea"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
      contextQuery: "¿Qué herramientas de video trabajamos esta semana?",
      payload: { query: "herramientas de video" },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("CONTEXT_INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK");
  });
});
