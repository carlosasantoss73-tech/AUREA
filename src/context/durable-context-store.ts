import { ContextCitation, ContextProvider, RetrievedContext } from "./context-retrieval-gate";

export interface ContextRecord {
  id: string;
  projectId: string;
  title: string;
  text: string;
  sourceId: string;
  version: number;
  tags?: string[];
}

export interface ContextStore {
  readonly records: readonly ContextRecord[];
  search(projectId: string, query: string): ContextRecord[];
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Read-only deterministic store. Production adapters can replace this implementation without changing the Gate/Runtime contract. */
export class InMemoryContextStore implements ContextStore {
  constructor(public readonly records: readonly ContextRecord[]) {}
  search(projectId: string, query: string): ContextRecord[] {
    const terms = normalize(query).split(/\s+/).filter(term => term.length >= 3);
    return this.records
      .filter(record => record.projectId === projectId)
      .map(record => ({ record, score: terms.reduce((score, term) => score + (normalize(`${record.title} ${record.text} ${(record.tags ?? []).join(" ")}`).includes(term) ? 1 : 0), 0) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
      .map(item => item.record);
  }
}

export function createStoreContextProvider(store: ContextStore): ContextProvider {
  return {
    async retrieve(input): Promise<RetrievedContext> {
      const records = store.search(input.projectId, input.query);
      const citations: ContextCitation[] = records.map(record => ({ sourceId: record.sourceId, documentId: record.id, version: record.version, title: record.title, excerpt: record.text.slice(0, 500) }));
      return {
        projectId: input.projectId,
        query: input.query,
        citations,
        facts: records.map(record => record.text),
      };
    },
  };
}
