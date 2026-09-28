import type { ContextProvider } from "./context-retrieval-gate";
import type { InstitutionalContextSource } from "./institutional-context-provider";
import { resolveInstitutionalAuthority, type InstitutionalAuthorityReader } from "./institutional-authority";
import { createInstitutionalContextProvider } from "./institutional-context-provider";

export function createGoogleDriveInstitutionalContextSource(
  reader: InstitutionalAuthorityReader,
): InstitutionalContextSource {
  return {
    async search(input) {
      const authority = await resolveInstitutionalAuthority(reader, input);
      return authority.records.map((record) => ({
        id: record.id,
        projectId: record.projectId,
        title: record.title,
        text: record.text,
        sourceId: record.sourceId,
        version: record.version,
        excerpt: record.excerpt,
      }));
    },
  };
}

export function createGoogleDriveInstitutionalContextProvider(
  reader: InstitutionalAuthorityReader,
): ContextProvider {
  return createInstitutionalContextProvider(createGoogleDriveInstitutionalContextSource(reader));
}
