import type { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import type { ExecutionAdapter } from "../execution-runtime.js";
import { ExecutionRuntime } from "../execution-runtime.js";
import {
  EcpInstitutionalExecutionAdapter,
  type EcpInstitutionalExecutionConfig,
} from "./institutional-execution-adapter.js";

/**
 * Register the ECP-only institutional decorator into a dedicated runtime.
 *
 * The supplied runtime MUST be dedicated to ECP: the decorator shares the
 * delegate's providerId and intentionally blocks execution until institutional
 * context is READY. Do not call this from Conchita's general-purpose worker.
 * This registration does not create a context provider or grant Drive access.
 */
export function registerEcpExecutionAdapter(input: {
  runtime: ExecutionRuntime;
  providerAdapter: ExecutionAdapter;
  contextGate: ContextRetrievalGate;
  config: EcpInstitutionalExecutionConfig;
}): EcpInstitutionalExecutionAdapter {
  const adapter = new EcpInstitutionalExecutionAdapter(
    input.providerAdapter,
    input.contextGate,
    input.config,
  );
  input.runtime.registerAdapter(adapter);
  return adapter;
}
