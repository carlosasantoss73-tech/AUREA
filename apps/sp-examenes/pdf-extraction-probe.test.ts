import { describe, expect, it } from "vitest";
import { extractPdfPages } from "./pdf-extraction-probe.js";

function makeOnePagePdf(): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length 51 >>\nstream\nBT /F1 12 Tf 20 50 Td (SP EXAMENES PDF TEST) Tj ET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

describe("extractPdfPages", () => {
  it("extracts text and preserves the source page number", async () => {
    const pages = await extractPdfPages(makeOnePagePdf());
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].text).toContain("SP EXAMENES PDF TEST");
  });

  it("rejects data that is not a PDF", async () => {
    await expect(extractPdfPages(new TextEncoder().encode("not a pdf")))
      .rejects.toThrow("cabecera PDF válida");
  });
});
