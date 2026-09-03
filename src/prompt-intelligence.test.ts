import { describe, expect, it } from "vitest";
import { compilePrompt } from "./prompt-intelligence";

describe("AUREA Prompt Intelligence", () => {
  it("builds research prompts with evidence gates", () => {
    const result = compilePrompt({
      modality: "RESEARCH",
      userRequest: "Investiga una oportunidad de negocio",
      context: "Ecuador y Chile",
      targetProvider: "Gemini",
      targetLanguage: "es-EC",
    });
    expect(result.languageStrategy).toBe("ENGLISH");
    expect(result.prompt).toContain("SOURCE_REQUIREMENTS");
    expect(result.prompt).toContain("cross-check");
  });

  it("does not force English for every provider", () => {
    const result = compilePrompt({
      modality: "RESEARCH",
      userRequest: "Analiza este documento",
      targetProvider: "Qwen",
      targetLanguage: "es-EC",
    });
    expect(result.languageStrategy).toBe("SOURCE");
  });

  it("adds audiovisual-specific controls", () => {
    const result = compilePrompt({
      modality: "VIDEO",
      userRequest: "Crear un video inmobiliario",
      context: "Terrazas Costa Limón",
      targetProvider: "Dreamina",
      targetLanguage: "es-EC",
    });
    expect(result.sections.VISUAL_SPEC).toContain("aspect ratio");
    expect(result.sections.AUDIO_SPEC).toContain("voice profile");
    expect(result.sections.NEGATIVE_CONSTRAINTS).toContain("prices");
  });
});
