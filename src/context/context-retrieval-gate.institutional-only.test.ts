import { describe, expect, it } from "vitest";
import { ContextRetrievalGate } from "./context-retrieval-gate";

describe("institutional-only retrieval", () => {
  it("blocks a local seed provider instead of silently falling back", async () => {
    const gate = new ContextRetrievalGate({
      async retrieve() {
        return {
          projectId: "tcl",
          query: "continuar",
          citations: [{ sourceId: "AUREA_LOCAL_SEED", documentId: "seed-1", version: 1 }],
          facts: ["local seed"],
        };
      },
    });
    const result = await gate.retrieve({
      actorId: "test",
      actorRole: "system",
      projectId: "tcl",
      query: "continuar",
      institutionalOnly: true,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toBe("INSTITUTIONAL_CONTEXT_REQUIRED_NO_LOCAL_FALLBACK");
  });

  it("allows institutional provenance", async () => {
    const gate = new ContextRetrievalGate({
      async retrieve() {
        return {
          projectId: "tcl",
          query: "continuar",
          citations: [{ sourceId: "KNOWLEDGE_OS", documentId: "doc-1", version: 11 }],
          facts: ["institutional evidence"],
        };
      },
    });
    const result = await gate.retrieve({
      actorId: "test",
      actorRole: "system",
      projectId: "tcl",
      query: "continuar",
      institutionalOnly: true,
    });
    expect(result.status).toBe("READY");
  });
});
