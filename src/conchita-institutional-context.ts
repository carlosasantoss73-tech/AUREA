import { createGoogleDriveInstitutionalContextProvider } from "./context/google-drive-institutional-context-provider.js";
import { GoogleDriveInstitutionalReader } from "./context/google-drive-institutional-reader.js";
import type { ContextProvider } from "./context/context-retrieval-gate.js";

/**
 * Builds the existing read-only Bibliotecario provider from explicit runtime
 * bindings. This helper does not deploy, write to Drive, or choose a project ID.
 * Callers must provide the verified current index ID and authorized read token.
 */
export function createConchitaInstitutionalContextProvider(input: {
  indexFileId: string;
  accessToken: string | (() => Promise<string>);
  fetchImpl?: typeof fetch;
}): ContextProvider {
  const reader = new GoogleDriveInstitutionalReader({
    indexFileId: input.indexFileId,
    accessToken: input.accessToken,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
  });
  return createGoogleDriveInstitutionalContextProvider(reader);
}
