import { describe, expect, it } from "vitest";
import { chunkExtractedEvidence, EvidenceChunkingError, type EvidenceDocumentInput } from "./evidence-chunker.js";

const base: EvidenceDocumentInput = {
  projectId: "ecp",
  documentId: "PLIEGO-001",
  title: "Pliego del procedimiento",
  version: "sha256:abc123",
  sourceUri: "https://source.example/pliego.pdf",
  mediaType: "application/pdf",
  blocks: [
    { locatorKind: "PAGE", locator: "p. 1", text: "OBJETO DEL PROCEDIMIENTO. Servicios técnicos especializados." },
    { locatorKind: "PAGE", locator: "p. 2", text: "EXPERIENCIA MÍNIMA. El oferente acreditará contratos similares." },
    { locatorKind: "PAGE", locator: "p. 3", text: "PERSONAL TÉCNICO. Se exige el personal definido en el pliego." },
  ],
};

describe("chunkExtractedEvidence", () => {
  it("preserves source document, version and page locators", () => {
    const chunks = chunkExtractedEvidence(base, { maxCharsPerChunk: 256 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.projectId === "ecp")).toBe(true);
    expect(chunks.every((chunk) => chunk.documentId === "PLIEGO-001")).toBe(true);
    expect(chunks.every((chunk) => chunk.version === "sha256:abc123")).toBe(true);
    expect(chunks.every((chunk) => chunk.sourceUri === base.sourceUri)).toBe(true);
    expect(chunks.map((chunk) => chunk.text).join("\n")).toContain("LOCALIZADOR PAGE: p. 2");
    expect(chunks.every((chunk) => chunk.integrity === "COMPLETE_BLOCKS")).toBe(true);
  });

  it("splits long extracted text without silently discarding content", () => {
    const longText = Array.from({ length: 160 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkExtractedEvidence({
      ...base,
      blocks: [{ locatorKind: "PAGE", locator: "p. 9", text: longText }],
    }, { maxCharsPerChunk: 256, maxCharsPerBlock: 256 });
    const joined = chunks.map((chunk) => chunk.text).join("\n");
    for (let i = 0; i < 160; i += 1) expect(joined).toContain(`word${i}`);
    expect(chunks.every((chunk) => chunk.textLength <= 256)).toBe(true);
  });

  it("rejects a token larger than the configured block limit instead of truncating it", () => {
    expect(() => chunkExtractedEvidence({
      ...base,
      blocks: [{ locatorKind: "PAGE", locator: "p. 4", text: "x".repeat(300) }],
    }, { maxCharsPerChunk: 256, maxCharsPerBlock: 256 })).toThrow(EvidenceChunkingError);
  });

  it("rejects missing source metadata and empty extracted documents", () => {
    expect(() => chunkExtractedEvidence({ ...base, documentId: " " })).toThrowError(EvidenceChunkingError);
    try { chunkExtractedEvidence({ ...base, documentId: " " }); } catch (error) { expect((error as EvidenceChunkingError).code).toBe("ECP_SOURCE_METADATA_REQUIRED"); }
    expect(() => chunkExtractedEvidence({ ...base, blocks: [] })).toThrow("ECP_DOCUMENT_TEXT_EMPTY");
  });

  it("rejects invalid limits", () => {
    try { chunkExtractedEvidence(base, { maxCharsPerChunk: 10 }); } catch (error) { expect((error as EvidenceChunkingError).code).toBe("ECP_INVALID_CHUNK_LIMIT"); }
  });
});
