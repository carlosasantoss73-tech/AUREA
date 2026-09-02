import { describe, expect, it } from "vitest";
import { runSalesMind } from "./sales-mind";
import { decideResilience } from "./sales-resilience";

describe("sales resilience", () => {
  it("changes approach when an objection returns", () => {
    const result = runSalesMind({
      message: "Sí me interesa, pero está caro y sigo con la misma duda.",
      objective: "orientar una compra",
    });

    const decision = decideResilience(result, {
      turnsSinceProgress: 1,
      objectionAttempts: 1,
      clarificationAttempts: 0,
      lastAction: "HANDLE_OBJECTION",
      unresolvedIssue: "precio",
    });

    expect(decision.action).toBe("CHANGE_APPROACH");
    expect(decision.nextAction).toBe("ASK");
  });

  it("hands off instead of pressuring after repeated objections", () => {
    const result = runSalesMind({
      message: "No, sigue siendo demasiado caro.",
      objective: "orientar una compra",
    });

    const decision = decideResilience(result, {
      turnsSinceProgress: 2,
      objectionAttempts: 2,
      clarificationAttempts: 0,
      lastAction: "HANDLE_OBJECTION",
    });

    expect(decision.action).toBe("HANDOFF");
    expect(decision.escalate).toBe(true);
  });

  it("changes approach after repeated clarification without looping", () => {
    const result = runSalesMind({
      message: "Tal vez, no estoy seguro.",
      objective: "orientar una compra",
    });

    const decision = decideResilience(result, {
      turnsSinceProgress: 2,
      objectionAttempts: 0,
      clarificationAttempts: 2,
      lastAction: "CLARIFY",
    });

    expect(decision.action).toBe("CHANGE_APPROACH");
    expect(decision.nextAction).toBe("EDUCATE");
  });

  it("pauses for follow-up when the conversation stops progressing", () => {
    const result = runSalesMind({
      message: "Cuánto cuesta?",
      objective: "orientar una compra",
    });

    const decision = decideResilience(result, {
      turnsSinceProgress: 3,
      objectionAttempts: 0,
      clarificationAttempts: 0,
      lastAction: "EDUCATE",
    });

    expect(decision.action).toBe("PAUSE_AND_FOLLOW_UP");
    expect(decision.nextAction).toBe("FOLLOW_UP");
  });

  it("respects an explicit human handoff request", () => {
    const result = runSalesMind({
      message: "Quiero hablar con una persona.",
      objective: "orientar una compra",
    });

    const decision = decideResilience(result, {
      turnsSinceProgress: 0,
      objectionAttempts: 0,
      clarificationAttempts: 0,
    });

    expect(decision.action).toBe("HANDOFF");
    expect(decision.escalate).toBe(true);
  });
});
