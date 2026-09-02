import { describe, expect, it } from "vitest";
import { runSalesMind } from "./sales-mind";
import { decideResilience } from "./sales-resilience";
import { createConversationMemory, recoverConversationContext, updateConversationMemory } from "./conversation-memory";

describe("AUREA Conversation Memory", () => {
  it("preserves facts while keeping inference separate", () => {
    const memory = createConversationMemory("c-1", "orientar compra", "2026-09-02T00:00:00.000Z");
    const result = runSalesMind({ message: "Quiero información, pero no sé qué me conviene", objective: "orientar compra" });
    const next = updateConversationMemory(memory, {
      message: "Quiero información, pero no sé qué me conviene",
      confirmedFacts: [{ value: "Busca información", source: "CUSTOMER", confidence: 1 }],
      openQuestions: ["¿Qué es lo más importante para ti?"]
    }, result, "CONTINUE", "2026-09-02T00:01:00.000Z");

    expect(next.confirmedFacts).toHaveLength(1);
    expect(next.confirmedFacts[0].value).toBe("Busca información");
    expect(next.needs.length).toBeGreaterThan(0);
    expect(next.turnCount).toBe(1);
  });

  it("recovers the latest operational context and preserves the resilience decision", () => {
    const memory = createConversationMemory("c-2", "vender", "2026-09-02T00:00:00.000Z");
    const result = runSalesMind({ message: "Está caro, sigo con la misma duda", objective: "vender" });
    const resilience = decideResilience(result, {
      turnsSinceProgress: 1,
      objectionAttempts: 1,
      clarificationAttempts: 0,
      lastAction: "HANDLE_OBJECTION",
    });
    const next = updateConversationMemory(memory, { message: "Está caro, sigo con la misma duda" }, result, resilience.action, "2026-09-02T00:02:00.000Z");
    const recovered = recoverConversationContext(next);

    expect(recovered.conversationId).toBe("c-2");
    expect(recovered.lastDecision).toBe("HANDLE_OBJECTION");
    expect(recovered.lastResilienceAction).toBe("CHANGE_APPROACH");
    expect(recovered.objections).toHaveLength(1);
  });

  it("updates the same fact instead of duplicating it", () => {
    let memory = createConversationMemory("c-3", "orientar", "2026-09-02T00:00:00.000Z");
    const result = runSalesMind({ message: "Quiero comprar", objective: "orientar" });
    memory = updateConversationMemory(memory, { message: "Quiero comprar", confirmedFacts: [{ value: "Busca comprar", source: "CUSTOMER", confidence: 0.8 }] }, result);
    memory = updateConversationMemory(memory, { message: "Quiero comprar", confirmedFacts: [{ value: "Busca comprar", source: "CUSTOMER", confidence: 1 }] }, result);

    expect(memory.confirmedFacts).toHaveLength(1);
    expect(memory.confirmedFacts[0].confidence).toBe(1);
    expect(memory.turnCount).toBe(2);
  });
});
