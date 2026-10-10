import { Buffer } from "node:buffer";
import * as ExcelJS from "exceljs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ExtractedEvidenceBlock } from "./evidence-chunker.js";

export const ECP_SUPPORTED_DOCUMENT_TYPES = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export interface DocumentExtractionLimits {
  maxBytes?: number;
  maxPdfPages?: number;
  maxWorkbookSheets?: number;
  maxWorkbookRows?: number;
}

export interface ExtractedDocumentEvidence {
  mediaType: string;
  blocks: ExtractedEvidenceBlock[];
  sourceBytes: number;
  sourceUnits: number;
  extractedUnits: number;
  warnings: string[];
}

export class DocumentExtractionError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

const DEFAULT_LIMITS: Required<DocumentExtractionLimits> = {
  maxBytes: 20 * 1024 * 1024,
  maxPdfPages: 2_000,
  maxWorkbookSheets: 500,
  maxWorkbookRows: 100_000,
};

function positiveLimit(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new DocumentExtractionError("ECP_INVALID_EXTRACTION_LIMIT", name);
  }
  return resolved;
}

function columnLetters(columnNumber: number): string {
  let value = columnNumber;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function scalarText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(scalarText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((part) => (part && typeof part === "object" ? scalarText((part as Record<string, unknown>).text) : ""))
        .filter(Boolean).join("");
    }
    if (typeof record.text === "string") return record.text;
    if (record.result !== undefined) return scalarText(record.result);
    if (typeof record.hyperlink === "string") return record.hyperlink;
    if (typeof record.formula === "string") return record.formula;
    return "";
  }
  return "";
}

async function extractPdf(bytes: Uint8Array, limits: Required<DocumentExtractionLimits>): Promise<ExtractedDocumentEvidence> {
  let document: Awaited<ReturnType<ReturnType<typeof getDocument>["promise"]["then"]>> | undefined;
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  try {
    const pdf = await loadingTask.promise;
    document = pdf as never;
    if (pdf.numPages > limits.maxPdfPages) {
      throw new DocumentExtractionError("ECP_PDF_PAGE_LIMIT_EXCEEDED", `pages=${pdf.numPages};limit=${limits.maxPdfPages}`);
    }
    const blocks: ExtractedEvidenceBlock[] = [];
    const warnings: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => {
            if (!("str" in item)) return "";
            return item.str + (item.hasEOL ? "\n" : " ");
          })
          .join("")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (text) blocks.push({ locatorKind: "PAGE", locator: `p. ${pageNumber}`, text });
        else warnings.push(`PDF_PAGE_NO_TEXT:p.${pageNumber}`);
      } finally {
        page.cleanup();
      }
    }
    if (blocks.length === 0) {
      throw new DocumentExtractionError("ECP_PDF_NO_TEXT_LAYER", "No selectable text extracted; OCR is not implemented by this extractor.");
    }
    return {
      mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.PDF,
      blocks,
      sourceBytes: bytes.byteLength,
      sourceUnits: pdf.numPages,
      extractedUnits: blocks.length,
      warnings,
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function extractXlsx(bytes: Uint8Array, limits: Required<DocumentExtractionLimits>): Promise<ExtractedDocumentEvidence> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(bytes));
  } catch {
    throw new DocumentExtractionError("ECP_XLSX_PARSE_FAILED", "Workbook could not be parsed as a valid XLSX file.");
  }
  if (workbook.worksheets.length > limits.maxWorkbookSheets) {
    throw new DocumentExtractionError("ECP_XLSX_SHEET_LIMIT_EXCEEDED", `sheets=${workbook.worksheets.length};limit=${limits.maxWorkbookSheets}`);
  }

  const blocks: ExtractedEvidenceBlock[] = [];
  const warnings: string[] = [];
  let rowsSeen = 0;
  let rowsWithText = 0;
  for (const worksheet of workbook.worksheets) {
    if (worksheet.state !== "visible") warnings.push(`XLSX_NON_VISIBLE_SHEET_INCLUDED:${worksheet.name}:${worksheet.state}`);
    try {
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rowsSeen += 1;
        if (rowsSeen > limits.maxWorkbookRows) {
          throw new DocumentExtractionError("ECP_XLSX_ROW_LIMIT_EXCEEDED", `rows>${limits.maxWorkbookRows}`);
        }
        const values: string[] = [];
        let lastColumn = 0;
        row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
          const value = scalarText(cell.value).replace(/\s+/g, " ").trim();
          if (!value) return;
          values.push(`${columnLetters(columnNumber)}=${value}`);
          lastColumn = Math.max(lastColumn, columnNumber);
        });
        if (!values.length) return;
        rowsWithText += 1;
        blocks.push({
          locatorKind: "ROW_RANGE",
          locator: `${worksheet.name}!${columnLetters(1)}${rowNumber}:${columnLetters(lastColumn)}${rowNumber}`,
          text: values.join(" | "),
        });
      });
    } catch (error) {
      if (error instanceof DocumentExtractionError) throw error;
      throw new DocumentExtractionError("ECP_XLSX_ROW_EXTRACTION_FAILED", worksheet.name);
    }
  }
  if (!blocks.length) {
    throw new DocumentExtractionError("ECP_XLSX_NO_CELL_TEXT", "Workbook has no non-empty cell text to cite.");
  }
  return {
    mediaType: ECP_SUPPORTED_DOCUMENT_TYPES.XLSX,
    blocks,
    sourceBytes: bytes.byteLength,
    sourceUnits: rowsSeen,
    extractedUnits: rowsWithText,
    warnings,
  };
}

export async function extractDocumentEvidence(
  input: { bytes: Uint8Array; mediaType: string },
  options: DocumentExtractionLimits = {},
): Promise<ExtractedDocumentEvidence> {
  const limits: Required<DocumentExtractionLimits> = {
    maxBytes: positiveLimit(options.maxBytes, DEFAULT_LIMITS.maxBytes, "maxBytes"),
    maxPdfPages: positiveLimit(options.maxPdfPages, DEFAULT_LIMITS.maxPdfPages, "maxPdfPages"),
    maxWorkbookSheets: positiveLimit(options.maxWorkbookSheets, DEFAULT_LIMITS.maxWorkbookSheets, "maxWorkbookSheets"),
    maxWorkbookRows: positiveLimit(options.maxWorkbookRows, DEFAULT_LIMITS.maxWorkbookRows, "maxWorkbookRows"),
  };
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0) {
    throw new DocumentExtractionError("ECP_DOCUMENT_BYTES_REQUIRED", "A non-empty document byte array is required.");
  }
  if (input.bytes.byteLength > limits.maxBytes) {
    throw new DocumentExtractionError("ECP_DOCUMENT_SIZE_LIMIT_EXCEEDED", `bytes=${input.bytes.byteLength};limit=${limits.maxBytes}`);
  }
  if (input.mediaType === ECP_SUPPORTED_DOCUMENT_TYPES.PDF) return extractPdf(input.bytes, limits);
  if (input.mediaType === ECP_SUPPORTED_DOCUMENT_TYPES.XLSX) return extractXlsx(input.bytes, limits);
  throw new DocumentExtractionError("ECP_UNSUPPORTED_DOCUMENT_TYPE", input.mediaType);
}
