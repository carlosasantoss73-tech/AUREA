import { describe, expect, it } from "vitest";
import {
  validateDocumentInput,
  validateExtractionUniverse,
  type DocumentExtractionResult,
} from "./document-ingestion.js";

describe("Document ingestion gate", () => {
  it("blocks an empty PDF", () => {
    const blockers = validateDocumentInput({
      documentId: "doc-1",
      fileName: "encuestas.pdf",
      mimeType: "application/pdf",
      kind: "PDF",
      bytes: new Uint8Array(),
    });
    expect(blockers).toContain("DOCUMENT_EMPTY");
  });

  it("fails closed when extracted universe differs from declared universe", () => {
    const result: DocumentExtractionResult = {
      documentId: "doc-2",
      surveys: [{ surveyId: "1", serviceMarks: [1], answers: {}, sourceDocumentId: "doc-2" }],
      warnings: [],
      blockers: [],
    };
    expect(validateExtractionUniverse(result, 2)).toContain(
      "SURVEY_UNIVERSE_MISMATCH:declared=2:found=1",
    );
  });

  it("accepts a consistent universe", () => {
    const result: DocumentExtractionResult = {
      documentId: "doc-3",
      surveys: [
        { surveyId: "1", serviceMarks: [1], answers: {}, sourceDocumentId: "doc-3" },
        { surveyId: "2", serviceMarks: [2], answers: {}, sourceDocumentId: "doc-3" },
      ],
      warnings: [],
      blockers: [],
    };
    expect(validateExtractionUniverse(result, 2)).toEqual([]);
  });
});
