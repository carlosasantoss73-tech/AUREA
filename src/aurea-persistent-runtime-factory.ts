import { AureaRuntime } from "./security/aurea-runtime";
import { ContextRetrievalGate } from "./context/context-retrieval-gate";
import { createPersistentContextProvider, JsonContextStore } from "./context/persistent-context-store";
import { AUREA_CONTINUITY_RECORDS } from "./context/default-context-provider";
import { ingestEvidence, IngestionInput, IngestionResult } from "./context/memory-ingestion";

export interface PersistentAureaMemory {
  runtime: AureaRuntime;
  store: JsonContextStore;
  ingest: (input: IngestionInput) => Promise<IngestionResult>;
}

/** Canonical deployment constructor: persistent retrieval + governed ingestion. */
export async function createPersistentAureaMemory(filePath: string): Promise<PersistentAureaMemory> {
  const { store, provider } = await createPersistentContextProvider(filePath, AUREA_CONTINUITY_RECORDS);
  return {
    store,
    runtime: new AureaRuntime(new ContextRetrievalGate(provider)),
    ingest: input => ingestEvidence(store, input),
  };
}

/** Backward-compatible Runtime-only constructor. */
export async function createPersistentAureaRuntime(filePath: string): Promise<AureaRuntime> {
  const memory = await createPersistentAureaMemory(filePath);
  return memory.runtime;
}
