import { describe, expect, it } from "vitest";
import { AureaRuntime } from "./aurea-runtime";
import { ContextProvider, ContextRetrievalGate } from "../context/context-retrieval-gate";

const baseRequest = {
  actorId: "librarian",
  actorRole: "system",
  projectId: "terrazas-costa-limon",
  capabilityId: "knowledge.read",
  toolId: "knowledge.search",
  action: "search",
  effectClass: "READ" as const,
  allowedProjects: ["terrazas-costa-limon"],
  allowedCapabilities: ["knowledge.read"],
  allowedTools: ["knowledge.search"],
};

describe("AUREA Runtime + Context Retrieval Gate", () => {
  it("automatically injects recovered context into the authorized tool call", async () => {
    const calls: unknown[] = [];
    const provider: ContextProvider = {
      async retrieve(input) {
        return {
          projectId: input.projectId,
          query: input.query,
          facts: ["Creati.ai was recorded as a discovery source/candidate."],
          citations: [{ sourceId: "technology-radar-2026-08-26", version: 1, excerpt: "candidate video tooling" }],
        };
      },
    };
    const runtime = new AureaRuntime(new ContextRetrievalGate(provider));
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => { calls.push(payload); return { ok: true }; } });

    const result = await runtime.execute({
      ...baseRequest,
      contextQuery: "¿Qué herramientas de video trabajamos esta semana?",
      payload: { query: "herramientas de video" },
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.context?.facts).toContain("Creati.ai was recorded as a discovery source/candidate.");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      query: "herramientas de video",
      __aureaContext: { projectId: "terrazas-costa-limon" },
    });
  });

  it("blocks a historical task when the Librarian has no evidence, preventing hallucinated continuity", async () => {
    const provider: ContextProvider = {
      async retrieve(input) {
        return { projectId: input.projectId, query: input.query, facts: [], citations: [] };
      },
    };
    const runtime = new AureaRuntime(new ContextRetrievalGate(provider));
    let executed = false;
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: () => { executed = true; return {}; } });

    const result = await runtime.execute({
      ...baseRequest,
      contextQuery: "continúa con lo que hicimos anteriormente",
      payload: { query: "continuidad" },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("CONTEXT_REQUIRED_BUT_NOT_FOUND");
    expect(executed).toBe(false);
  });
});
