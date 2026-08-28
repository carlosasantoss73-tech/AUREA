import { AureaRuntime } from "./security/aurea-runtime";
import { ContextRetrievalGate } from "./context/context-retrieval-gate";
import { createPersistentContextProvider } from "./context/persistent-context-store";
import { AUREA_CONTINUITY_RECORDS } from "./context/default-context-provider";

/**
 * Production-oriented constructor. Knowledge is persisted to disk and seeded
 * only when a record is not already present. The deployment can later replace
 * the file provider with a database/search adapter without changing Runtime.
 */
export async function createPersistentAureaRuntime(filePath: string): Promise<AureaRuntime> {
  const { provider } = await createPersistentContextProvider(filePath, AUREA_CONTINUITY_RECORDS);
  return new AureaRuntime(new ContextRetrievalGate(provider));
}
