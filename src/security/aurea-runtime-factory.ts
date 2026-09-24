import { ContextProvider, ContextRetrievalGate } from "../context/context-retrieval-gate";
import { defaultContextProvider } from "../context/default-context-provider";
import { AureaRuntime } from "./aurea-runtime";

/** Canonical runtime factory: historical retrieval is ON by default. */
export function createAureaRuntime(contextProvider: ContextProvider = defaultContextProvider): AureaRuntime {
  return new AureaRuntime(new ContextRetrievalGate(contextProvider));
}
