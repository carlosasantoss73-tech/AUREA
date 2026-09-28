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
  it("accepts an injected institutional context provider without changing the runtime boundary", async () => {
    const runtime = createAureaRuntime({
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["institutional evidence"],
          citations: [{
            sourceId: "KNOWLEDGE_OS",
            documentId: "doc-1",
            version: "v1",
            provenance: "INSTITUTIONAL",
          }],
        };
      },
    });
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
      contextQuery: "continuar",
      payload: { query: "continuar" },
    });
    expect(result.status).toBe("EXECUTED");
    expect(result.context?.citations[0]?.provenance).toBe("INSTITUTIONAL");
  });

});
