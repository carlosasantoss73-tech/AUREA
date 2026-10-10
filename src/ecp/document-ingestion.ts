import { createHash } from "node:crypto";
import {
  extractDocumentEvidence,
  type DocumentExtractionLimits,
} from "./document-extractor.js";
import {
  chunkExtractedEvidence,
  type EvidenceChunk,
  type EvidenceChunkingOptions,
} from "./evidence-chunker.js";

export interface EcpDocumentIngestionInput {
  bytes: Uint8Array;
  mediaType: string;
  projectId: string;
  documentId: string;
  title: string;
  sourceUri: string;
}

export interface EcpDocumentIngestionOptions {
  extraction?: DocumentExtractionLimits;
  chunking?: EvidenceChunkingOptions;
}

export interface EcpDocumentIngestionResult {
  projectId: string;
  documentId: string;
  title: string;
  sourceUri: string;
  mediaType: string;
  sourceSha256: string;
  sourceVersion: string;
  sourceBytes: number;
  sourceUnits: number;
  extractedUnits: number;
  warnings: string[];
  chunks: EvidenceChunk[];
}

/**
 * In-memory ingestion pipeline for a caller-supplied original document.
 * It extracts text, records a SHA-256 content version, and chunks only with
 * stable page/sheet-row locators. It does not persist or upload anything.
 */
export async function ingestEcpDocument(
  input: EcpDocumentIngestionInput,
  options: EcpDocumentIngestionOptions = {},
): Promise<EcpDocumentIngestionResult> {
  for (const [field, value] of Object.entries({
    projectId: input.projectId,
    documentId: input.documentId,
    title: input.title,
    sourceUri: input.sourceUri,
  })) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`ECP_INGESTION_METADATA_REQUIRED:${field}`);
    }
  }
  if (input.projectId.trim().toLowerCase() !== "ecp") {
    throw new Error("ECP_INGESTION_PROJECT_SCOPE_MISMATCH");
  }

  const bytes = new Uint8Array(input.bytes);
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const extraction = await extractDocumentEvidence({
    bytes,
    mediaType: input.mediaType,
  }, options.extraction);
  const sourceVersion = `sha256:${sourceSha256}`;
  const chunks = chunkExtractedEvidence({
    projectId: input.projectId,
    documentId: input.documentId,
    title: input.title,
    version: sourceVersion,
    sourceUri: input.sourceUri,
    mediaType: extraction.mediaType,
    blocks: extraction.blocks,
  }, options.chunking);

  return {
    projectId: input.projectId,
    documentId: input.documentId,
    title: input.title,
    sourceUri: input.sourceUri,
    mediaType: extraction.mediaType,
    sourceSha256,
    sourceVersion,
    sourceBytes: extraction.sourceBytes,
    sourceUnits: extraction.sourceUnits,
    extractedUnits: extraction.extractedUnits,
    warnings: extraction.warnings,
    chunks,
  };
}
