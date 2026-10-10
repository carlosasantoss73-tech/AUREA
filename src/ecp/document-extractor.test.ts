import { Buffer } from "node:buffer";
import * as ExcelJS from "@ayocore/exceljs";
import { describe, expect, it } from "vitest";
import {
  DocumentExtractionError,
  extractDocumentEvidence,
  ECP_SUPPORTED_DOCUMENT_TYPES,
} from "./document-extractor.js";

function makePdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

describe("extractDocumentEvidence", () => {
  it("extracts PDF text with stable page locators", async () => {
    const result = await extractDocumentEvidence({
      bytes: makePdf("ECP requisito verificable"),
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.PDF,
    });
    expect(result.sourceUnits).toBe(1);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].locator).toBe("p. 1");
    expect(result.blocks[0].text).toContain("ECP requisito verificable");
  });

  it("extracts XLSX values with sheet and row locators", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Oferta");
    sheet.addRow(["Requisito", "Oferente", "Resultado"]);
    sheet.addRow(["Experiencia", "Proveedor A", "Consta"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const result = await extractDocumentEvidence({
      bytes,
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.XLSX,
    });
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[1].locator).toBe("Oferta!A2:C2");
    expect(result.blocks[1].text).toContain("B=Proveedor A");
    expect(result.blocks[1].text).toContain("C=Consta");
  });

  it("fails closed for unsupported types, corrupt files and oversized documents", async () => {
    await expect(extractDocumentEvidence({ bytes: new Uint8Array([1]), mediaType: "text/plain" }))
      .rejects.toMatchObject({ code: "ECP_UNSUPPORTED_DOCUMENT_TYPE" });
    await expect(extractDocumentEvidence({
      bytes: new Uint8Array([1, 2, 3]),
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.XLSX,
    })).rejects.toMatchObject({ code: "ECP_XLSX_PARSE_FAILED" });
    await expect(extractDocumentEvidence({
      bytes: new Uint8Array(1025),
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.PDF,
    }, { maxBytes: 1024 })).rejects.toMatchObject({ code: "ECP_DOCUMENT_SIZE_LIMIT_EXCEEDED" });
  });

  it("validates limits before processing", async () => {
    await expect(extractDocumentEvidence({
      bytes: new Uint8Array([1]),
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.PDF,
    }, { maxPdfPages: 0 })).rejects.toBeInstanceOf(DocumentExtractionError);
  });
});
