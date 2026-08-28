import { describe, expect, it } from "vitest";
import { ContextRetrievalGate, ContextProvider, requiresHistoricalContext } from "./context-retrieval-gate";

function providerWith(calls: string[], facts: string[] = ["fact recovered"], citations = [{ sourceId: "conversation-2026-08", documentId: "doc-1", version: 1 }]): ContextProvider {
  return {
    async retrieve(input) {
      calls.push(`${input.projectId}:${input.query}`);
      return { projectId: input.projectId, query: input.query, facts, citations };
    },
  };
}

describe("AUREA B14 Context Retrieval Gate", () => {
  it("detects continuity-sensitive requests without requiring the user to say 'recover memory'", () => {
    expect(requiresHistoricalContext("¿Qué herramientas de video trabajamos esta semana?")) .toBe(true);
    expect(requiresHistoricalContext("continúa con lo que hicimos ayer")) .toBe(true);
    expect(requiresHistoricalContext("crea un video nuevo para Terrazas")) .toBe(false);
  });

  it("automatically retrieves historical context before continuing", async () => {
    const calls: string[] = [];
    const gate = new ContextRetrievalGate(providerWith(calls));
    const result = await gate.retrieve({
      actorId: "aureo",
      actorRole: "system",
      projectId: "terrazas-costa-limon",
      query: "¿Qué herramientas de video trabajamos esta semana?",
      allowedProjects: ["terrazas-costa-limon"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
    });

    expect(result.status).toBe("READY");
    expect(result.context?.facts).toContain("fact recovered");
    expect(result.context?.citations[0].sourceId).toBe("conversation-2026-08");
    expect(calls).toHaveLength(1);
  });

  it("does not invoke the provider for a request that needs no historical context", async () => {
    const calls: string[] = [];
    const gate = new ContextRetrievalGate(providerWith(calls));
    const result = await gate.retrieve({
      actorId: "aureo",
      actorRole: "system",
      projectId: "terrazas-costa-limon",
      query: "Genera un anuncio vertical de 30 segundos",
      allowedProjects: ["terrazas-costa-limon"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
    });

    expect(result.status).toBe("NOT_NEEDED");
    expect(calls).toHaveLength(0);
  });

  it("blocks automatic retrieval when project scope is not authorized", async () => {
    const calls: string[] = [];
    const gate = new ContextRetrievalGate(providerWith(calls));
    const result = await gate.retrieve({
      actorId: "aureo",
      actorRole: "system",
      projectId: "terrazas-costa-limon",
      query: "recupera lo que hicimos esta semana",
      allowedProjects: ["otro-proyecto"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("PROJECT_SCOPE_DENIED");
    expect(calls).toHaveLength(0);
  });

  it("returns EMPTY instead of allowing the agent to invent historical context", async () => {
    const calls: string[] = [];
    const gate = new ContextRetrievalGate(providerWith(calls, [], []));
    const result = await gate.retrieve({
      actorId: "aureo",
      actorRole: "system",
      projectId: "aurea",
      query: "¿qué hicimos anteriormente sobre este proyecto?",
      allowedProjects: ["aurea"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
    });

    expect(result.status).toBe("EMPTY");
    expect(result.reason).toBe("HISTORICAL_CONTEXT_NOT_FOUND");
    expect(calls).toHaveLength(1);
  });
});
