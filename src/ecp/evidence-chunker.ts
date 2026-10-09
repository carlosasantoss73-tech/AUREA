/**
 * Deterministic chunking for text already extracted from an original document.
 *
 * This is not a PDF/OCR/Excel parser. The caller must supply extracted text and
 * stable page/sheet/row locators. The chunker preserves those locators and
 * refuses oversized single blocks rather than silently truncating evidence.
 */

export type EvidenceLocatorKind = "PAGE" | "SHEET_RANGE" | "ROW_RANGE" | "SECTION" | "UNKNOWN";

export interface ExtractedEvidenceBlock {
  text: string;
  locator: string;
  locatorKind: EvidenceLocatorKind;
}

export interface EvidenceDocumentInput {
  projectId: string;
  documentId: string;
  title: string;
  version: string;
  sourceUri: string;
  mediaType: string;
  blocks: ExtractedEvidenceBlock[];
}

export interface EvidenceChunk {
  chunkId: string;
  projectId: string;
  documentId: string;
  title: string;
  version: string;
  sourceUri: string;
  mediaType: string;
  locatorKind: EvidenceLocatorKind;
  locator: string;
  chunkIndex: number;
  chunkCount: number;
  text: string;
  textLength: number;
  integrity: "COMPLETE_BLOCKS";
}

export interface EvidenceChunkingOptions {
  maxCharsPerChunk?: number;
  maxCharsPerBlock?: number;
  overlapChars?: number;
}

export class EvidenceChunkingError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "EvidenceChunkingError";
  }
}

function required(value: string, field: string): string {
  if (!value.trim()) throw new EvidenceChunkingError("ECP_SOURCE_METADATA_REQUIRED", field);
  return value.trim();
}

function splitOversizedBlock(block: ExtractedEvidenceBlock, maxChars: number): ExtractedEvidenceBlock[] {
  if (block.text.length <= maxChars) return [block];
  // Split only at whitespace boundaries and keep the same source locator.
  const words = block.text.split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxChars) {
      throw new EvidenceChunkingError("ECP_UNSPLITTABLE_TOKEN_EXCEEDS_LIMIT", block.locator);
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) parts.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) parts.push(current);
  return parts.map((text) => ({ ...block, text }));
}

export function chunkExtractedEvidence(
  input: EvidenceDocumentInput,
  options: EvidenceChunkingOptions = {},
): EvidenceChunk[] {
  const maxChars = options.maxCharsPerChunk ?? 8_000;
  const maxBlock = options.maxCharsPerBlock ?? maxChars;
  const overlap = options.overlapChars ?? 0;
  if (!Number.isInteger(maxChars) || maxChars < 256) {
    throw new EvidenceChunkingError("ECP_INVALID_CHUNK_LIMIT", "maxCharsPerChunk must be an integer >= 256");
  }
  if (!Number.isInteger(maxBlock) || maxBlock < 1 || maxBlock > maxChars) {
    throw new EvidenceChunkingError("ECP_INVALID_BLOCK_LIMIT", "maxCharsPerBlock must be between 1 and maxCharsPerChunk");
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= maxChars) {
    throw new EvidenceChunkingError("ECP_INVALID_OVERLAP", "overlapChars must be >= 0 and < maxCharsPerChunk");
  }

  const metadata = {
    projectId: required(input.projectId, "projectId"),
    documentId: required(input.documentId, "documentId"),
    title: required(input.title, "title"),
    version: required(input.version, "version"),
    sourceUri: required(input.sourceUri, "sourceUri"),
    mediaType: required(input.mediaType, "mediaType"),
  };
  if (!input.blocks.length) throw new EvidenceChunkingError("ECP_DOCUMENT_TEXT_EMPTY", metadata.documentId);

  const normalized = input.blocks.flatMap((block) => {
    if (!block.text.trim()) return [];
    required(block.locator, "block.locator");
    const prefixLength = `[LOCALIZADOR ${block.locatorKind}: ${block.locator}]\n`.length;
    const contentLimit = Math.min(maxBlock, maxChars) - prefixLength;
    if (contentLimit < 1) throw new EvidenceChunkingError("ECP_LOCATOR_EXCEEDS_LIMIT", block.locator);
    return splitOversizedBlock(block, contentLimit);
  });
  if (!normalized.length) throw new EvidenceChunkingError("ECP_DOCUMENT_TEXT_EMPTY", metadata.documentId);

  const renderBlock = (block: ExtractedEvidenceBlock) =>
    `[LOCALIZADOR ${block.locatorKind}: ${block.locator}]\n${block.text}`;
  const groups: ExtractedEvidenceBlock[][] = [];
  let current: ExtractedEvidenceBlock[] = [];
  let length = 0;
  for (const block of normalized) {
    const renderedLength = renderBlock(block).length;
    const added = renderedLength + (current.length ? 2 : 0);
    if (current.length && length + added > maxChars) {
      groups.push(current);
      const overlapBlocks: ExtractedEvidenceBlock[] = [];
      let overlapLength = 0;
      if (overlap > 0) {
        for (let i = current.length - 1; i >= 0; i -= 1) {
          const candidate = current[i];
          const candidateLength = renderBlock(candidate).length + (overlapBlocks.length ? 2 : 0);
          if (overlapLength + candidateLength > overlap) break;
          overlapBlocks.unshift(candidate);
          overlapLength += candidateLength;
        }
      }
      current = [...overlapBlocks];
      length = overlapLength;
    }
    const nextLength = renderedLength + (current.length ? 2 : 0);
    if (current.length && length + nextLength > maxChars) {
      groups.push(current);
      current = [];
      length = 0;
    }
    current.push(block);
    length += renderedLength + (current.length > 1 ? 2 : 0);
  }
  if (current.length) groups.push(current);

  const count = groups.length;
  return groups.map((group, index) => {
    const first = group[0];
    const last = group[group.length - 1];
    const locator = first.locator === last.locator ? first.locator : `${first.locator} — ${last.locator}`;
    const text = group.map((block) => `[LOCALIZADOR ${block.locatorKind}: ${block.locator}]\n${block.text}`).join("\n\n");
    return {
      ...metadata,
      chunkId: `${metadata.documentId}@${metadata.version}#${index + 1}`,
      locatorKind: first.locatorKind === last.locatorKind ? first.locatorKind : "UNKNOWN",
      locator,
      chunkIndex: index + 1,
      chunkCount: count,
      text,
      textLength: text.length,
      integrity: "COMPLETE_BLOCKS" as const,
    };
  });
}
