import { AureaRuntime } from "./security/aurea-runtime";
import { ContextRetrievalGate, type ContextProvider } from "./context/context-retrieval-gate";
import { defaultContextProvider } from "./context/default-context-provider";

/** Canonical constructor: every production Runtime gets the continuity gate by default. */
export function createAureaRuntime(contextProvider: ContextProvider = defaultContextProvider): AureaRuntime {
  return new AureaRuntime(new ContextRetrievalGate(contextProvider));
}
