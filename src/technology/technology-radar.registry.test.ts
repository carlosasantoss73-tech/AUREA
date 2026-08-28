import { describe, expect, it } from "vitest";
import { TECHNOLOGY_RADAR_B11 } from "./technology-radar.registry";

describe("AUREA Technology Radar continuity", () => {
  it("retains the historical video/voice candidates without falsely marking them integrated", () => {
    const names = TECHNOLOGY_RADAR_B11.map(item => item.name);
    expect(names).toContain("MoneyPrinterTurbo");
    expect(names).toContain("OmniVoice / OmniVoice Studio");
    expect(names).toContain("Creati.ai");
    expect(TECHNOLOGY_RADAR_B11.every(item => item.state === "DISCOVERED")).toBe(true);
  });

  it("keeps Creati.ai distinct from Created.ai / CreatAI.io", () => {
    const directory = TECHNOLOGY_RADAR_B11.find(item => item.name === "Creati.ai");
    const content = TECHNOLOGY_RADAR_B11.find(item => item.name === "Created.ai / CreatAI.io");
    expect(directory?.notes).toContain("fuente de descubrimiento");
    expect(content?.function).toContain("automatización de contenido");
  });
});
