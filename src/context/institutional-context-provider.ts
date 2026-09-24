import type { ContextCitation, ContextProvider, RetrievedContext } from "./context-retrieval-gate.js";

export interface InstitutionalContextSource {
  /**
   * Read-only institutional search boundary.
   * The implementation must query the authoritative Knowledge OS/Bibliotecario source.
   * It must not synthesize records or silently fall back to local seeds.
   */
  search(input: {
    projectId: string;
    query: string;
    traceId: string;
  }): Promise<InstitutionalContextRecord[]>;
}

export interface InstitutionalContextRecord {
  id: string;
  projectId: string;
  title: string;
  text: string;
  sourceId: string;
  version: number;
  excerpt?: string;
}

/**
 * Adapter boundary between AUREA Runtime and the institutional Bibliotecario.
 * This file intentionally contains no external connector implementation.
 */
export function createInstitutionalContextProvider(
  source: InstitutionalContextSource,
): ContextProvider {
  return {
    async retrieve(input): Promise<RetrievedContext> {
      const records = await source.search(input);
      const scoped = records.filter((record) => record.projectId === input.projectId);

      const citations: ContextCitation[] = scoped.map((record) => ({
        sourceId: record.sourceId,
        documentId: record.id,
        version: record.version,
        title: record.title,
        excerpt: record.excerpt ?? record.text.slice(0, 500),
      }));

      return {
        projectId: input.projectId,
        query: input.query,
        citations,
        facts: scoped.map((record) => record.text),
      };
    },
  };
}
