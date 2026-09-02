import { describe, expect, it } from "vitest";
import { assessListening, decideSalesAction, runSalesMind } from "./sales-mind";

describe("AUREA Sales Mind", () => {
  it("listens before recommending when the need is unclear", () => {
    const result = runSalesMind({ message: "Estoy viendo opciones, pero no sé qué me conviene", objective: "orientar al cliente" });
    expect(result.listening.signals).toContain("OBJECTION");
    expect(result.listening.signals).toContain("UNCERTAINTY");
    expect(result.decision.action).toBe("HANDLE_OBJECTION");
  });

  it("separates explicit content from inferred need", () => {
    const listening = assessListening({ message: "Quiero información", objective: "vender" });
    expect(listening.explicitMessage).toBe("Quiero información");
    expect(listening.inferredNeeds.length).toBeGreaterThan(0);
    expect(listening.contradictions).toEqual([]);
  });

  it("hands off when the person explicitly requests a human", () => {
    const listening = assessListening({ message: "Prefiero hablar con una persona", objective: "vender" });
    expect(decideSalesAction(listening, "vender").action).toBe("HANDOFF");
  });

  it("does not treat a buying signal as proof of purchase", () => {
    const result = runSalesMind({ message: "Quiero reservar", objective: "convertir la oportunidad" });
    expect(result.listening.signals).toContain("BUYING_SIGNAL");
    expect(result.decision.action).toBe("CLOSE");
    expect(result.decision.rationale).toContain("debe convertirse");
  });
});
