import type { InstitutionalContextRecord, InstitutionalContextSource } from "./institutional-context-provider.js";
import { resolveInstitutionalAuthority, type InstitutionalAuthorityReader } from "./institutional-authority.js";

/**
 * Adapts the existing Bibliotecario authority contract to the runtime's
 * institutional search boundary. A concrete read-only connector must still
 * implement InstitutionalAuthorityReader; this adapter does not access Drive.
 */
export function createInstitutionalAuthoritySource(
  reader: InstitutionalAuthorityReader,
): InstitutionalContextSource {
  return {
    async search(input): Promise<InstitutionalContextRecord[]> {
      const resolution = await resolveInstitutionalAuthority(reader, input);
      return resolution.records.map((record) => ({
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
