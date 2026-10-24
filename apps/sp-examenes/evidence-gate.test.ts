import { describe, expect, it } from "vitest";
import { enforceEvidenceGate } from "./evidence-gate.js";

describe("enforceEvidenceGate", () => {
  it("replaces unsupported legal classification with NO CONCLUYENTE and low confidence", () => {
    const answer = [
      "Respuesta propuesta: La omisión se clasifica como subsanable.",
      "Fundamento verificable: La normativa general permite subsanar.",
      "Fuentes oficiales: SERCOP — https://example.test",
      "Qué no se pudo verificar: No se encontró un artículo específico que clasifique esta omisión.",
      "Confianza: media"
    ].join("\n\n");
    const result = enforceEvidenceGate(answer);
    expect(result).toContain("Respuesta propuesta:\nNO CONCLUYENTE");
    expect(result).toContain("Confianza: baja");
    expect(result).not.toContain("La omisión se clasifica como subsanable.");
    expect(result).toContain("SERCOP — https://example.test");
  });

  it("blocks a qualified insubsanable conclusion when the exact legal article is missing", () => {
    const answer = [
      "Respuesta propuesta: La omisión del oferente de incluir o referenciar el manual de fábrica en su oferta se clasifica generalmente como una falta insubsanable.",
      "Fundamento verificable: La normativa general establece requisitos técnicos.",
      "Fuentes oficiales: LOSNCP — https://example.test",
      "Qué no se pudo verificar: No se encontró un artículo o numeral en los textos oficiales disponibles que cite explícitamente la clasificación de la omisión del manual de fábrica en estas circunstancias. No se halló texto literal que defina esta omisión como subsanable o insubsanable.",
      "Confianza: media"
    ].join("\n\n");
    const result = enforceEvidenceGate(answer);
    expect(result).toContain("Respuesta propuesta:\nNO CONCLUYENTE");
    expect(result).toContain("Confianza: baja");
    expect(result).not.toContain("se clasifica generalmente como una falta insubsanable");
  });

  it("preserves a supported answer when no missing-rule warning exists", () => {
    const answer = "Respuesta propuesta: Subsanable.\n\nFuentes oficiales: norma aplicable.";
    expect(enforceEvidenceGate(answer)).toBe(answer);
  });

  it("preserves a non-conclusive answer without a classification assertion", () => {
    const answer = "Respuesta propuesta: NO CONCLUYENTE.\n\nQué no se pudo verificar: falta el artículo específico.";
    expect(enforceEvidenceGate(answer)).toBe(answer);
  });
});
