import { ContextRecord, ContextStore } from "./durable-context-store";

export interface IngestionInput {
  projectId: string;
  sourceId: string;
  title: string;
  text: string;
  version?: number;
  tags?: string[];
  occurredAt?: string;
}

export interface IngestionResult {
  action: "CREATED" | "UPDATED" | "UNCHANGED";
  record: ContextRecord;
}

/**
 * Converts externally supplied evidence into durable ContextRecords.
 * This layer never invents facts: the caller must provide the source and text.
 */
export async function ingestEvidence(store: ContextStore & { upsert?: (record: ContextRecord) => Promise<void> }, input: IngestionInput): Promise<IngestionResult> {
  const existing = store.records.find(record => record.id === stableId(input));
  if (existing && existing.text === input.text && existing.title === input.title && existing.sourceId === input.sourceId && JSON.stringify(existing.tags ?? []) === JSON.stringify(input.tags ?? [])) {
    return { action: "UNCHANGED", record: existing };
  }

  const version = existing
    ? Math.max(existing.version + 1, input.version ?? 0)
    : (input.version ?? 1);
  const record: ContextRecord = {
    id: stableId(input), projectId: input.projectId, title: input.title, text: input.text,
    sourceId: input.sourceId, version, tags: input.tags,
  };
  if (!store.upsert) throw new Error("CONTEXT_STORE_NOT_WRITABLE");
  await store.upsert(record);
  return { action: existing ? "UPDATED" : "CREATED", record };
}

export function stableId(input: Pick<IngestionInput, "projectId" | "sourceId" | "title">): string {
  return `${input.projectId}:${input.sourceId}:${input.title}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-");
}
