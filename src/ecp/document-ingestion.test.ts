import * as ExcelJS from "@ayocore/exceljs";
import { describe, expect, it } from "vitest";
import { ingestEcpDocument } from "./document-ingestion.js";

describe("ingestEcpDocument", () => {
  it("connects XLSX extraction to citation-preserving chunks and source hash", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Requisitos");
    sheet.addRow(["Código", "Requisito"]);
    sheet.addRow(["R-01", "Experiencia específica verificable"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

    const result = await ingestEcpDocument({
      bytes,
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      projectId: "ecp",
      documentId: "MATRIZ-ORIGINAL-01",
      title: "Matriz original de requisitos",
      sourceUri: "case-file://MATRIZ-ORIGINAL-01",
    }, { chunking: { maxCharsPerChunk: 512 } });

    expect(result.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sourceVersion).toBe(`sha256:${result.sourceSha256}`);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].projectId).toBe("ecp");
    expect(result.chunks[0].documentId).toBe("MATRIZ-ORIGINAL-01");
    expect(result.chunks[0].version).toBe(result.sourceVersion);
    expect(result.chunks[0].locator).toContain("Requisitos!A1:B1");
    expect(result.chunks[0].locator).toContain("Requisitos!A2:B2");
    expect(result.chunks[0].text).toContain("LOCALIZADOR ROW_RANGE: Requisitos!A1:B1");
    expect(result.chunks[0].text).toContain("LOCALIZADOR ROW_RANGE: Requisitos!A2:B2");
  });

  it("rejects non-ECP scope before parsing the source", async () => {
    await expect(ingestEcpDocument({
      bytes: new Uint8Array([1]),
      mediaType: "text/plain",
      projectId: "personal",
      documentId: "DOC-1",
      title: "Documento",
      sourceUri: "case-file://DOC-1",
    })).rejects.toThrow("ECP_INGESTION_PROJECT_SCOPE_MISMATCH");
  });

  it("requires the original document metadata and never invents a source URI", async () => {
    await expect(ingestEcpDocument({
      bytes: new Uint8Array([1]),
      mediaType: "text/plain",
      projectId: "ecp",
      documentId: "DOC-1",
      title: "Documento",
      sourceUri: " ",
    })).rejects.toThrow("ECP_INGESTION_METADATA_REQUIRED:sourceUri");
  });
});
