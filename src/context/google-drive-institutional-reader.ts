import type {
  InstitutionalAuthorityReader,
  InstitutionalIndexRef,
  InstitutionalRecord,
} from "./institutional-authority";

type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

interface GoogleDriveInstitutionalReaderOptions {
  indexFileId: string;
  accessToken: string | (() => Promise<string>);
  fetchImpl?: FetchLike;
  maxIndexDepth?: number;
}

interface IndexDocument {
  meta: JsonObject;
  payload: JsonObject;
}

const DRIVE_BASE = "https://www.googleapis.com/drive/v3/files";

function asObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`BIBLIOTECARIO_V011_INVALID_OBJECT:${label}`);
  }
  return value as JsonObject;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`BIBLIOTECARIO_V011_INVALID_STRING:${label}`);
  }
  return value;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
    const versionMatch = normalized.match(/^(?:v)?(\d+)(?:\.\d+)*(?:\s*\([^)]*\))?$/i);
    if (versionMatch) return Number(versionMatch[1]);
  }
  throw new Error(`BIBLIOTECARIO_V011_INVALID_NUMBER:${label}`);
}

function queryMatches(record: InstitutionalRecord, query: string): boolean {
  const terms = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .split(/\s+/).filter((term) => term.length >= 3);
  if (!terms.length) return true;
  const haystack = `${record.title} ${record.text} ${record.projectId} ${record.sourceId}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

export class GoogleDriveInstitutionalReader implements InstitutionalAuthorityReader {
  private readonly fetchImpl: FetchLike;
  private readonly maxIndexDepth: number;

  constructor(private readonly options: GoogleDriveInstitutionalReaderOptions) {
    if (!options.indexFileId.trim()) throw new Error("BIBLIOTECARIO_INDEX_ID_REQUIRED");
    if (!options.accessToken) throw new Error("BIBLIOTECARIO_ACCESS_TOKEN_REQUIRED");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxIndexDepth = options.maxIndexDepth ?? 32;
  }

  async readCurrentIndex(traceId: string): Promise<InstitutionalIndexRef> {
    const document = await this.loadIndexDocument(this.options.indexFileId, traceId);
    return this.toIndexRef(document, this.options.indexFileId);
  }

  async readIndex(fileId: string, traceId: string): Promise<InstitutionalIndexRef> {
    const document = await this.loadIndexDocument(fileId, traceId);
    return this.toIndexRef(document, fileId);
  }

  async readRecords(indexFileId: string, input: { projectId: string; query: string; traceId: string }): Promise<InstitutionalRecord[]> {
    const candidates: Array<{ record: InstitutionalRecord; indexVersion?: number; indexFileId: string; rawState: string }> = [];
    const conflicts: Array<{ id: string; reason: string; occurrences: Array<{ indexFileId: string; indexVersion?: number; state: string }> }> = [];
    const visited = new Set<string>();
    let cursor: string | undefined = indexFileId;

    for (let depth = 0; cursor; depth += 1) {
      if (depth >= this.maxIndexDepth) throw new Error("BIBLIOTECARIO_INDEX_CHAIN_DEPTH_EXCEEDED");
      if (visited.has(cursor)) throw new Error("BIBLIOTECARIO_INDEX_CHAIN_CYCLE");
      visited.add(cursor);
      const document = await this.loadIndexDocument(cursor, input.traceId);
      const indexVersion = this.tryIndexVersion(document.payload.version_indice);
      candidates.push(...this.extractRecordCandidates(document.payload, cursor, input, depth === 0, indexVersion));
      cursor = this.previousIndexFileId(document.payload);
    }

    const byId = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      const group = byId.get(candidate.record.id) ?? [];
      group.push(candidate);
      byId.set(candidate.record.id, group);
    }

    const resolved: InstitutionalRecord[] = [];
    for (const [id, group] of byId) {
      if (group.length === 1) {
        const only = group[0];
        if ((only.rawState === "VIGENTE" || only.rawState === "APROBADO") &&
            (only.record.state === "VIGENTE" || only.record.state === "APROBADO")) resolved.push(only.record);
        continue;
      }

      const versions = group.map((item) => item.indexVersion);
      const allVersionsKnown = versions.every((version): version is number => version !== undefined);
      const uniqueVersions = new Set(versions);
      if (!allVersionsKnown || uniqueVersions.size !== versions.length) {
        conflicts.push({
          id,
          reason: !allVersionsKnown ? "INDEX_VERSION_MISSING" : "INDEX_VERSION_TIE",
          occurrences: group.map(({ indexFileId, indexVersion, rawState }) => ({ indexFileId, indexVersion, state: rawState })),
        });
        continue;
      }

      // The reader traverses the index chain from current to historical.
      // Duplicate occurrences must therefore have strictly descending index
      // versions in traversal order. A malformed chain must not be repaired by
      // selecting the numeric maximum.
      if (versions.some((version, index) => index > 0 && versions[index - 1]! <= version!)) {
        conflicts.push({
          id,
          reason: "INDEX_CHAIN_ORDER_CONFLICT",
          occurrences: group.map(({ indexFileId, indexVersion, rawState }) => ({ indexFileId, indexVersion, state: rawState })),
        });
        continue;
      }

      const newestVersion = versions[0]!;
      const newest = group.filter((item) => item.indexVersion === newestVersion);
      if (newest.length !== 1) {
        conflicts.push({
          id, reason: "INDEX_PRECEDENCE_UNRESOLVED",
          occurrences: group.map(({ indexFileId, indexVersion, rawState }) => ({ indexFileId, indexVersion, state: rawState })),
        });
        continue;
      }
      const selected = newest[0];
      // Resolve identity first, then apply retrieval eligibility. Never rewrite
      // the source state: a newer non-retrievable state suppresses older copies.
      if ((selected.rawState === "VIGENTE" || selected.rawState === "APROBADO") &&
          (selected.record.state === "VIGENTE" || selected.record.state === "APROBADO")) resolved.push(selected.record);
    }

    if (conflicts.length) console.warn("BIBLIOTECARIO_RECORD_PRECEDENCE_CONFLICTS:" + JSON.stringify(conflicts));
    return resolved.filter((record) => queryMatches(record, input.query));
  }

  private async loadIndexDocument(fileId: string, traceId: string): Promise<IndexDocument> {
    const token = typeof this.options.accessToken === "function"
      ? await this.options.accessToken()
      : this.options.accessToken;
    if (!token.trim()) throw new Error("BIBLIOTECARIO_ACCESS_TOKEN_EMPTY");

    const headers = { Authorization: `Bearer ${token}` };
    const metaResponse = await this.fetchImpl(
      `${DRIVE_BASE}/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents,version,modifiedTime,capabilities(canEdit,canDownload,canCopy)`,
      { headers },
    );
    if (!metaResponse.ok) throw new Error(`BIBLIOTECARIO_DRIVE_METADATA_HTTP_${metaResponse.status}:${traceId}`);
    const meta = asObject(await metaResponse.json(), "metadata");
    if (meta.id !== fileId) throw new Error("BIBLIOTECARIO_INDEX_ID_MISMATCH");
    if (meta.mimeType !== "application/json") throw new Error("BIBLIOTECARIO_INDEX_NOT_JSON");
    // Drive capabilities describe what this principal may write; they are not a read-authorization check.
    // Authorization is enforced by the access token and the subsequent Drive API responses.
    asObject(meta.capabilities, "capabilities");

    const contentResponse = await this.fetchImpl(
      `${DRIVE_BASE}/${encodeURIComponent(fileId)}?alt=media`,
      { headers },
    );
    if (!contentResponse.ok) throw new Error(`BIBLIOTECARIO_DRIVE_CONTENT_HTTP_${contentResponse.status}:${traceId}`);
    const raw = await contentResponse.text();
    if (!raw.trim()) throw new Error("BIBLIOTECARIO_INDEX_CONTENT_EMPTY");

    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { throw new Error("BIBLIOTECARIO_INDEX_NOT_VALID_JSON"); }
    return { meta, payload: asObject(payload, "payload") };
  }

  private toIndexRef(document: IndexDocument, requestedFileId: string): InstitutionalIndexRef {
    const state = asString(document.payload.estado_indice, "estado_indice");
    if (state !== "VIGENTE" && state !== "REEMPLAZADO") throw new Error(`BIBLIOTECARIO_UNKNOWN_INDEX_STATE:${state}`);
    return {
      fileId: requestedFileId,
      version: asNumber(document.payload.version_indice, "version_indice"),
      state,
      ...(this.previousIndexFileId(document.payload)
        ? { previousIndexFileId: this.previousIndexFileId(document.payload) }
        : {}),
    };
  }

  private previousIndexFileId(payload: JsonObject): string | undefined {
    const previous = payload.indice_anterior;
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) return undefined;
    return asOptionalString((previous as JsonObject).fileId);
  }

  private tryIndexVersion(value: unknown): number | undefined {
    try { return asNumber(value, "version_indice"); } catch { return undefined; }
  }

  private extractRecordCandidates(payload: JsonObject, indexFileId: string, input: { projectId: string; query: string; traceId: string }, required: boolean, indexVersion?: number): Array<{ record: InstitutionalRecord; indexVersion?: number; indexFileId: string; rawState: string }> {
    // Incremental indexes may introduce any versioned collection
    // (registros_nuevos_v001, registros_nuevos_v012, ...). Avoid hard-coding v011.
    const incrementalKeys = Object.keys(payload)
      .filter((key) => /^registros_nuevos_v\d{3}$/.test(key))
      .sort();
    const hasLegacyRecords = Array.isArray(payload.registros);
    const hasIncrementalRecords = incrementalKeys.some((key) => Array.isArray(payload[key]));
    if (!hasLegacyRecords && !hasIncrementalRecords) {
      if (!required) return [];
      throw new Error(`BIBLIOTECARIO_RECORDS_COLLECTION_MISSING:${indexFileId}`);
    }

    const rawRecords: unknown[] = [
      ...(hasLegacyRecords ? payload.registros as unknown[] : []),
      ...incrementalKeys.flatMap((key) => Array.isArray(payload[key]) ? payload[key] as unknown[] : []),
    ];

    return rawRecords.flatMap((raw, position) => {
      const item = asObject(raw, `records[${position}]`);
      const rawState = asString(item.estado, `record[${position}].estado`);
      // Keep non-retrievable states as identity candidates so a newer source
      // state (e.g. EN PRUEBA) cannot accidentally expose an older VIGENTE copy.
      const retrievableState = rawState === "VIGENTE" || rawState === "APROBADO";
      const state = (retrievableState ? rawState : "NO_VERIFICADO") as InstitutionalRecord["state"];

      const projectId = asString(item.proyecto, `record[${position}].proyecto`);
      const title = asString(item.nombre, `record[${position}].nombre`);
      const text = asString(item.descripcion, `record[${position}].descripcion`);
      const sourceId = asString(item.fuente, `record[${position}].fuente`);
      const id = asString(item.id, `record[${position}].id`);
      const version = asString(item.version, `record[${position}].version`);
      const location = item.ubicacion;
      const locationObject = location && typeof location === "object" && !Array.isArray(location) ? location as JsonObject : undefined;
      const sourceDocumentId = asOptionalString(locationObject?.fileId);

      if (projectId !== input.projectId) return [];
      return [{
        record: {
          id, projectId, title, text,
          sourceId: sourceDocumentId ?? sourceId,
          version, state, excerpt: text.slice(0, 500),
        },
        indexVersion,
        indexFileId,
        rawState,
      }];
    });
  }
}
