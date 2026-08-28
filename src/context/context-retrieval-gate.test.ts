import { describe, expect, it } from "vitest";
import { ContextRetrievalGate, ContextProvider, requiresHistoricalContext } from "./context-retrieval-gate";

const provider = (facts: string[] = ["fact recovered"], citations = [{ sourceId: "historical-source", version: 1 }]): ContextProvider => ({
  async retrieve(input) { return { projectId: input.projectId, query: input.query, facts, citations }; },
});

const req = (query: string) => ({ actorId: "aureo", actorRole: "system", projectId: "aurea", query, allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"] });

describe("AUREA B14 Context Retrieval Gate", () => {
  it("detects continuity without requiring the user to say recover memory", () => {
    expect(requiresHistoricalContext("¿Qué herramientas trabajamos esta semana?")).toBe(true);
    expect(requiresHistoricalContext("continúa con lo que hicimos ayer")).toBe(true);
    expect(requiresHistoricalContext("crea un video nuevo")).toBe(false);
  });
  it("retrieves automatically", async () => {
    const result = await new ContextRetrievalGate(provider()).retrieve(req("¿Qué herramientas trabajamos esta semana?"));
    expect(result.status).toBe("READY");
    expect(result.context?.facts).toContain("fact recovered");
  });
  it("does not retrieve when continuity is not indicated", async () => {
    const result = await new ContextRetrievalGate(provider()).retrieve(req("Genera un anuncio vertical"));
    expect(result.status).toBe("NOT_NEEDED");
  });
  it("blocks cross-project retrieval", async () => {
    const result = await new ContextRetrievalGate(provider()).retrieve({ ...req("recupera lo que hicimos esta semana"), allowedProjects: ["otro"] });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("PROJECT_SCOPE_DENIED");
  });
  it("returns EMPTY instead of inventing historical context", async () => {
    const result = await new ContextRetrievalGate(provider([], [])).retrieve(req("¿qué hicimos anteriormente?"));
    expect(result.status).toBe("EMPTY");
  });
});
