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
    const records: InstitutionalRecord[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined = indexFileId;

    for (let depth = 0; cursor; depth += 1) {
      if (depth >= this.maxIndexDepth) throw new Error("BIBLIOTECARIO_INDEX_CHAIN_DEPTH_EXCEEDED");
      if (visited.has(cursor)) throw new Error("BIBLIOTECARIO_INDEX_CHAIN_CYCLE");
      visited.add(cursor);
      const document = await this.loadIndexDocument(cursor, input.traceId);
      records.push(...this.extractRecords(document.payload, cursor, input, depth === 0));
      cursor = this.previousIndexFileId(document.payload);
    }

    return records.filter((record) => queryMatches(record, input.query));
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

  private extractRecords(payload: JsonObject, indexFileId: string, input: { projectId: string; query: string; traceId: string }, required: boolean): InstitutionalRecord[] {
    const rawRecords = Array.isArray(payload.registros_nuevos_v011)
      ? payload.registros_nuevos_v011
      : Array.isArray(payload.registros)
        ? payload.registros
        : undefined;
    if (!rawRecords) {
      if (!required) return [];
      throw new Error(`BIBLIOTECARIO_RECORDS_COLLECTION_MISSING:${indexFileId}`);
    }

    return rawRecords.flatMap((raw, position) => {
      const item = asObject(raw, `records[${position}]`);
      const rawState = asString(item.estado, `record[${position}].estado`);
      // The institutional source contains additional operational states (for
      // example PROPUESTA and EN PRUEBA). They are real source values, but they
      // are outside the retrieval contract and must never be promoted.
      if (rawState !== "VIGENTE" && rawState !== "APROBADO") return [];
      const state = rawState as InstitutionalRecord["state"];

      const projectId = asString(item.proyecto, `record[${position}].proyecto`);
      const title = asString(item.nombre, `record[${position}].nombre`);
      const text = asString(item.descripcion, `record[${position}].descripcion`);
      const sourceId = asString(item.fuente, `record[${position}].fuente`);
      const id = asString(item.id, `record[${position}].id`);
      const version = asString(item.version, `record[${position}].version`);
      const location = item.ubicacion;
      const locationObject = location && typeof location === "object" && !Array.isArray(location) ? location as JsonObject : undefined;
      const sourceDocumentId = asOptionalString(locationObject?.fileId);

      return {
        id, projectId, title, text,
        sourceId: sourceDocumentId ?? sourceId,
        version, state, excerpt: text.slice(0, 500),
      };
    }).filter((record) => record.projectId === input.projectId && (record.state === "VIGENTE" || record.state === "APROBADO"));
  }
}
