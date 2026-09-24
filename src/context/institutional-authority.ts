/**
 * BIB-05 — Institutional authority resolution contract.
 *
 * This module is deliberately source-agnostic: it does not connect to Drive,
 * mutate Knowledge OS, or synthesize institutional facts.
 *
 * It formalizes the minimum contract an authoritative reader must satisfy:
 * current index → version chain → scoped records → provenance.
 */

export type InstitutionalRecordState =
  | "VIGENTE"
  | "APROBADO"
  | "REEMPLAZADO"
  | "HISTORICO"
  | "INFERENCIA"
  | "PENDIENTE"
  | "NO_VERIFICADO";

export interface InstitutionalIndexRef {
  fileId: string;
  version: number;
  state: "VIGENTE" | "REEMPLAZADO";
  previousIndexFileId?: string;
}

export interface InstitutionalRecord {
  id: string;
  projectId: string;
  title: string;
  text: string;
  sourceId: string;
  version: number;
  state: InstitutionalRecordState;
  excerpt?: string;
}

export interface AuthorityResolution {
  records: InstitutionalRecord[];
  traversedIndexFileIds: string[];
  currentIndex: InstitutionalIndexRef;
}

export interface InstitutionalAuthorityReader {
  readCurrentIndex(traceId: string): Promise<InstitutionalIndexRef>;
  readIndex(fileId: string, traceId: string): Promise<InstitutionalIndexRef>;
  readRecords(indexFileId: string, input: {
    projectId: string;
    query: string;
    traceId: string;
  }): Promise<InstitutionalRecord[]>;
}

/**
 * Resolves only the authoritative chain. Historical index records are retained
 * for provenance but are never promoted to current state.
 */
export async function resolveInstitutionalAuthority(
  reader: InstitutionalAuthorityReader,
  input: { projectId: string; query: string; traceId: string },
): Promise<AuthorityResolution> {
  const current = await reader.readCurrentIndex(input.traceId);
  if (current.state !== "VIGENTE") {
    throw new Error("INSTITUTIONAL_CURRENT_INDEX_NOT_VIGENTE");
  }

  const traversed = [current.fileId];
  let cursor: InstitutionalIndexRef | undefined = current;

  while (cursor.previousIndexFileId) {
    const previous = await reader.readIndex(cursor.previousIndexFileId, input.traceId);
    if (previous.fileId !== cursor.previousIndexFileId) {
      throw new Error("INSTITUTIONAL_INDEX_CHAIN_ID_MISMATCH");
    }
    traversed.push(previous.fileId);
    cursor = previous;
  }

  const records = await reader.readRecords(current.fileId, input);
  const scoped = records.filter((record) =>
    record.projectId === input.projectId &&
    (record.state === "VIGENTE" || record.state === "APROBADO"),
  );

  return { records: scoped, traversedIndexFileIds: traversed, currentIndex: current };
}
