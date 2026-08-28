import { describe, expect, it } from "vitest";
import { defaultContextProvider } from "./default-context-provider";

describe("Default AUREA continuity source", () => {
  it("recovers the video tools from the consolidated historical evidence", async () => {
    const result = await defaultContextProvider.retrieve({ projectId: "aurea", query: "¿Qué herramientas de video trabajamos esta semana?", traceId: "trace" });
    expect(result.facts.some(f => f.includes("MoneyPrinterTurbo"))).toBe(true);
    expect(result.facts.some(f => f.includes("Creati.ai"))).toBe(true);
    expect(result.citations.length).toBeGreaterThan(0);
  });
  it("recovers voice tooling without relying on model recall", async () => {
    const result = await defaultContextProvider.retrieve({ projectId: "aurea", query: "¿Qué herramientas de voz trabajamos esta semana?", traceId: "trace" });
    expect(result.facts.some(f => f.includes("OmniVoice"))).toBe(true);
  });
});
