import { describe, expect, it } from "vitest";
import { technologyRadarContextProvider } from "./technology-radar-context-provider";

describe("Technology Radar continuity provider", () => {
  it("recovers video candidates", async () => {
    const context = await technologyRadarContextProvider.retrieve({ projectId: "aurea", query: "herramientas de video que trabajamos esta semana", traceId: "trace-test" });
    expect(context.facts.some(fact => fact.includes("MoneyPrinterTurbo"))).toBe(true);
    expect(context.citations.every(citation => citation.sourceId === "AUREA_DOCUMENTO_MAESTRO_B11")).toBe(true);
  });
  it("recovers voice tooling", async () => {
    const context = await technologyRadarContextProvider.retrieve({ projectId: "aurea", query: "herramientas de voz TTS", traceId: "trace-test" });
    expect(context.facts.some(fact => fact.includes("OmniVoice"))).toBe(true);
  });
});
