import { describe, expect, it } from "vitest";
import { createAureaRuntime } from "./aurea-runtime-factory";

describe("AUREA canonical runtime factory", () => {
  it("fails closed instead of using local continuity seeds by default", async () => {
    const runtime = createAureaRuntime();
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const result = await runtime.execute({
      actorId: "librarian", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ",
      allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
      contextQuery: "¿Qué herramientas de video trabajamos esta semana?", payload: { query: "video" }, dryRun: true,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("CONTEXT_INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK");
  });

  it("accepts an institutional context provider", async () => {
    const provider = {
      async retrieve(input: { projectId: string; query: string; traceId: string }) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["institutional evidence"],
          citations: [{ sourceId: "KNOWLEDGE_OS", documentId: "doc-1", version: 11, provenance: "INSTITUTIONAL" }],
        };
      },
    };
    const runtime = createAureaRuntime(provider);
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const result = await runtime.execute({
      actorId: "librarian", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ",
      allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
      contextQuery: "¿Qué dice el Bibliotecario sobre continuidad?", payload: { query: "continuidad" }, dryRun: true,
    });
    expect(result.status).toBe("DRY_RUN");
    expect(result.context?.facts).toEqual(["institutional evidence"]);
    expect(result.context?.citations[0]).toMatchObject({ sourceId: "KNOWLEDGE_OS", documentId: "doc-1", version: 11 });
  });
});
