import { describe, expect, it } from "vitest";
import { AureaRuntime } from "./aurea-runtime";
import { ContextRetrievalGate, ContextProvider } from "../context/context-retrieval-gate";

const request = {
  actorId: "librarian", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ" as const,
  allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
};

describe("AUREA Runtime + Context Retrieval Gate", () => {
  it("injects recovered historical context into the authorized tool call", async () => {
    const calls: unknown[] = [];
    const provider: ContextProvider = { async retrieve(input) { return { projectId: input.projectId, query: input.query, facts: ["historical fact"], citations: [{ sourceId: "historical", version: 1 }] }; } };
    const runtime = new AureaRuntime(new ContextRetrievalGate(provider));
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => { calls.push(payload); return { ok: true }; } });
    const result = await runtime.execute({ ...request, contextQuery: "¿Qué trabajamos esta semana?", payload: { query: "continuidad" } });
    expect(result.status).toBe("EXECUTED");
    expect(result.context?.facts).toContain("historical fact");
    expect(calls[0]).toMatchObject({ __aureaContext: { projectId: "aurea" } });
  });

  it("blocks historical execution when no evidence is recovered", async () => {
    const provider: ContextProvider = { async retrieve(input) { return { projectId: input.projectId, query: input.query, facts: [], citations: [] }; } };
    const runtime = new AureaRuntime(new ContextRetrievalGate(provider));
    let executed = false;
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: () => { executed = true; return {}; } });
    const result = await runtime.execute({ ...request, contextQuery: "continúa con lo que hicimos anteriormente", payload: {} });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("CONTEXT_REQUIRED_BUT_NOT_FOUND");
    expect(executed).toBe(false);
  });
});
