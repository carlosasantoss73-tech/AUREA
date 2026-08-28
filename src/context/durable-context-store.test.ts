import { describe, expect, it } from "vitest";
import { createStoreContextProvider, InMemoryContextStore, ContextRecord } from "./durable-context-store";

describe("Durable Context Store", () => {
  const records: ContextRecord[] = [
    { id: "video-tools", projectId: "aurea", title: "Technology Radar video tools", text: "MoneyPrinterTurbo is a discovered video generation candidate. Creati.ai is a discovery directory.", sourceId: "AUREA_B11", version: 1, tags: ["video", "technology-radar"] },
    { id: "voice-tools", projectId: "aurea", title: "Technology Radar voice tools", text: "OmniVoice / OmniVoice Studio is a discovered TTS/STT candidate.", sourceId: "AUREA_B11", version: 1, tags: ["voice", "tts"] },
    { id: "other-project", projectId: "other", title: "Video", text: "Secret unrelated project record", sourceId: "OTHER", version: 1 },
  ];

  it("retrieves relevant historical records with citations", async () => {
    const provider = createStoreContextProvider(new InMemoryContextStore(records));
    const result = await provider.retrieve({ projectId: "aurea", query: "herramientas de video", traceId: "trace" });
    expect(result.facts.some(fact => fact.includes("MoneyPrinterTurbo"))).toBe(true);
    expect(result.citations[0].sourceId).toBe("AUREA_B11");
  });

  it("enforces project isolation", async () => {
    const provider = createStoreContextProvider(new InMemoryContextStore(records));
    const result = await provider.retrieve({ projectId: "aurea", query: "Secret unrelated project", traceId: "trace" });
    expect(result.facts).toHaveLength(0);
    expect(result.citations).toHaveLength(0);
  });
});
