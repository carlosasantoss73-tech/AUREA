import type { ExecutionAdapter } from "../execution-runtime.js";
import { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import { createGoogleDriveInstitutionalContextProvider } from "../context/google-drive-institutional-context-provider.js";
import { GoogleDriveInstitutionalReader } from "../context/google-drive-institutional-reader.js";
import { ExecutionRuntime } from "../execution-runtime.js";
import { registerEcpExecutionAdapter } from "./register-ecp-execution.js";
import type { EcpInstitutionalExecutionConfig } from "./institutional-execution-adapter.js";

/**
 * Compose the existing read-only Google Drive Bibliotecario reader with the
 * existing ECP context gate and execution decorator.
 *
 * This is a composition helper, not a deployment. The caller must supply an
 * authorized access token and the verified current-index file ID, and must
 * register it only in a dedicated ECP runtime. No Drive writes are performed.
 */
export function registerGoogleDriveEcpExecutionAdapter(input: {
  runtime: ExecutionRuntime;
  providerAdapter: ExecutionAdapter;
  indexFileId: string;
  accessToken: string | (() => Promise<string>);
  config: EcpInstitutionalExecutionConfig;
  fetchImpl?: typeof fetch;
}) {
  const reader = new GoogleDriveInstitutionalReader({
    indexFileId: input.indexFileId,
    accessToken: input.accessToken,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });
  const contextProvider = createGoogleDriveInstitutionalContextProvider(reader);
  const contextGate = new ContextRetrievalGate(contextProvider);

  return registerEcpExecutionAdapter({
    runtime: input.runtime,
    providerAdapter: input.providerAdapter,
    contextGate,
    config: input.config,
  });
}
