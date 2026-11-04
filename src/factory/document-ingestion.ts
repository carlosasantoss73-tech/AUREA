export type SupportedDocumentKind = "PDF" | "IMAGE" | "SPREADSHEET";

export interface DocumentInput {
  documentId: string;
  fileName: string;
  mimeType: string;
  kind: SupportedDocumentKind;
  bytes: Uint8Array;
  declaredSurveyCount?: number;
}

export interface ExtractedSurvey {
  surveyId: string;
  serviceMarks: number[];
  answers: Record<string, number | null>;
  sourceDocumentId: string;
  sourcePage?: number;
}

export interface DocumentExtractionResult {
  documentId: string;
  pagesDetected?: number;
  surveys: ExtractedSurvey[];
  warnings: string[];
  blockers: string[];
}

export interface DocumentExtractor {
  readonly adapterId: string;
  extract(input: DocumentInput): Promise<DocumentExtractionResult>;
}

export function validateDocumentInput(input: DocumentInput): string[] {
  const blockers: string[] = [];
  if (!input.documentId) blockers.push("DOCUMENT_MISSING_ID");
  if (!input.fileName) blockers.push("DOCUMENT_MISSING_FILENAME");
  if (!input.mimeType) blockers.push("DOCUMENT_MISSING_MIME");
  if (!input.bytes?.length) blockers.push("DOCUMENT_EMPTY");
  if (input.kind === "PDF" && input.mimeType !== "application/pdf") {
    blockers.push("PDF_MIME_MISMATCH");
  }
  if (input.declaredSurveyCount !== undefined && input.declaredSurveyCount < 0) {
    blockers.push("INVALID_DECLARED_SURVEY_COUNT");
  }
  return blockers;
}

export function validateExtractionUniverse(
  result: DocumentExtractionResult,
  declaredSurveyCount?: number,
): string[] {
  const blockers = [...result.blockers];
  if (
    declaredSurveyCount !== undefined &&
    result.surveys.length !== declaredSurveyCount
  ) {
    blockers.push(
      `SURVEY_UNIVERSE_MISMATCH:declared=${declaredSurveyCount}:found=${result.surveys.length}`,
    );
  }
  return blockers;
}
