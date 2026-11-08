import { describe, expect, it } from "vitest";
import { extractPdfPages } from "./pdf-extraction-probe.js";

const documents = [
  {
    name: "LOSNCP oficial",
    url: "https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2025/12/LOSNCP.pdf",
    pages: 77,
    markers: ["LEY ORGÁNICA DEL SISTEMA NACIONAL DE CONTRATACIÓN PÚBLICA", "2025-10-07"]
  },
  {
    name: "Reglamento General oficial reformado",
    url: "https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2026/08/REGLAMENTO-DE-LA-LEY-ORGANICA-SISTEMA-NACIONAL-CONTRATACION-PUBLICA.pdf",
    pages: 176,
    markers: ["REGLAMENTO GENERAL DE LA LEY ORGÁNICA DEL SISTEMA NACIONAL DE CONTRATACIÓN", "Decreto Ejecutivo No. 461", "30 de julio del 2026"]
  }
];

describe("extracción de documentos normativos oficiales", () => {
  it.each(documents)("extrae y verifica $name", async document => {
    const started = Date.now();
    const response = await fetch(document.url, { signal: AbortSignal.timeout(60000) });
    expect(response.ok, `HTTP ${response.status} al descargar ${document.name}`).toBe(true);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 5))).toBe("%PDF-");

    const pages = await extractPdfPages(bytes);
    const text = pages.map(page => page.text).join("\\n");
    expect(pages).toHaveLength(document.pages);
    expect(pages.every(page => page.text.length > 0)).toBe(true);
    for (const marker of document.markers) {
      expect(text.toLowerCase()).toContain(marker.toLowerCase());
    }

    console.info(JSON.stringify({
      document: document.name,
      bytes: bytes.length,
      pages: pages.length,
      extractedCharacters: text.length,
      elapsedMs: Date.now() - started,
      markersVerified: document.markers
    }));
  }, 180000);
});
