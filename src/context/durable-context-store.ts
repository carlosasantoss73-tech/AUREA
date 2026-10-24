import { ContextCitation, ContextProvider, RetrievedContext } from "./context-retrieval-gate";

export interface ContextRecord {
  id: string;
  projectId: string;
  title: string;
  text: string;
  sourceId: string;
  version: number;
  tags?: string[];
  provenance?: "LOCAL_SEED" | "INSTITUTIONAL";
}

export interface ContextStore {
  readonly records: readonly ContextRecord[];
  search(projectId: string, query: string): ContextRecord[];
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Read-only deterministic store. Production adapters can replace this implementation without changing the Gate/Runtime contract. */
export class InMemoryContextStore implements ContextStore {
  constructor(public readonly records: readonly ContextRecord[]) {}
  search(projectId: string, query: string): ContextRecord[] {
    const terms = normalize(query).split(/\s+/).filter(term => term.length >= 3);
    return this.records
      .filter(record => record.projectId === projectId)
      .map(record => ({ record, score: terms.reduce((score, term) => score + (normalize(`${record.title} ${record.text} ${(record.tags ?? []).join(" ")}`).includes(term) ? 1 : 0), 0) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
      .map(item => item.record);
  }
}

export function createStoreContextProvider(store: ContextStore): ContextProvider {
  return {
    async retrieve(input): Promise<RetrievedContext> {
      const records = store.search(input.projectId, input.query);
      const citations: ContextCitation[] = records.map(record => ({ sourceId: record.sourceId, documentId: record.id, version: record.version, title: record.title, excerpt: record.text.slice(0, 500), provenance: record.provenance }));
      return {
        projectId: input.projectId,
        query: input.query,
        citations,
        facts: records.map(record => record.text),
      };
    },
  };
}


/**
 * Compact operational checkpoint. It records progress metadata only; Knowledge OS remains
 * the authority for institutional documents and evidence.
 */
export interface ProjectCheckpoint {
  schemaVersion: 1;
  projectId: string;
  updatedAt: string;
  summary: string;
  completed: string[];
  blockers: string[];
  nextAction: string;
  evidenceRefs: string[];
}

export interface ProjectCheckpointStore {
  save(checkpoint: ProjectCheckpoint): Promise<void>;
  load(projectId: string): Promise<ProjectCheckpoint | null>;
}

export interface ProjectCheckpointDurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const CHECKPOINT_PROJECT_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const CHECKPOINT_SECRET_PATTERN = /(?:bearer\s+[a-z0-9._~+/-]{8,}|(?:api[_ -]?key|access[_ -]?token|password|client[_ -]?secret)\s*[:=]\s*\S+|(?:sk-[a-z0-9]{12,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|AIza[a-z0-9_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----))/i;
const CHECKPOINT_FIELDS = new Set(["schemaVersion", "projectId", "updatedAt", "summary", "completed", "blockers", "nextAction", "evidenceRefs"]);

function checkpointText(value: unknown, field: string, maxLength: number, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > maxLength) {
    throw new Error(`PROJECT_CHECKPOINT_INVALID_FIELD:${field}`);
  }
  if (CHECKPOINT_SECRET_PATTERN.test(value)) throw new Error("PROJECT_CHECKPOINT_SECRET_LIKE_CONTENT_REJECTED");
  return value;
}

function checkpointList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 10) throw new Error(`PROJECT_CHECKPOINT_INVALID_FIELD:${field}`);
  return value.map((item, index) => checkpointText(item, `${field}[${index}]`, 240));
}

/** Strict allow-list validation keeps checkpoint state small and excludes arbitrary documents/secrets. */
export function normalizeProjectCheckpoint(value: unknown, expectedProjectId?: string): ProjectCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PROJECT_CHECKPOINT_INVALID_OBJECT");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !CHECKPOINT_FIELDS.has(key))) throw new Error("PROJECT_CHECKPOINT_UNKNOWN_FIELD");
  if (input.schemaVersion !== 1) throw new Error("PROJECT_CHECKPOINT_UNSUPPORTED_SCHEMA");
  const projectId = checkpointText(input.projectId, "projectId", 64);
  if (!CHECKPOINT_PROJECT_ID.test(projectId)) throw new Error("PROJECT_CHECKPOINT_INVALID_PROJECT_ID");
  if (expectedProjectId && projectId !== expectedProjectId) throw new Error("PROJECT_CHECKPOINT_PROJECT_MISMATCH");
  const updatedAt = checkpointText(input.updatedAt, "updatedAt", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(updatedAt) || !Number.isFinite(Date.parse(updatedAt))) {
    throw new Error("PROJECT_CHECKPOINT_INVALID_TIMESTAMP");
  }
  const checkpoint: ProjectCheckpoint = {
    schemaVersion: 1,
    projectId,
    updatedAt,
    summary: checkpointText(input.summary, "summary", 800, true),
    completed: checkpointList(input.completed, "completed"),
    blockers: checkpointList(input.blockers, "blockers"),
    nextAction: checkpointText(input.nextAction, "nextAction", 400, true),
    evidenceRefs: checkpointList(input.evidenceRefs, "evidenceRefs"),
  };
  if (new TextEncoder().encode(JSON.stringify(checkpoint)).byteLength > 8192) {
    throw new Error("PROJECT_CHECKPOINT_SIZE_LIMIT_EXCEEDED");
  }
  return checkpoint;
}

/**
 * Adapter over the already-configured CONCHITA_EXECUTION_STATE Durable Object binding.
 * Callers must provide the project scope they are authorized to manage; no public endpoint
 * is added. Durable Object errors are surfaced as failures (never silently replaced).
 */
export class DurableObjectProjectCheckpointStore implements ProjectCheckpointStore {
  private readonly allowedProjects: ReadonlySet<string>;

  constructor(
    private readonly stub: ProjectCheckpointDurableObjectStub,
    allowedProjectIds: readonly string[],
  ) {
    if (!allowedProjectIds.length || allowedProjectIds.some((id) => !CHECKPOINT_PROJECT_ID.test(id))) {
      throw new Error("PROJECT_CHECKPOINT_ALLOWED_PROJECTS_REQUIRED");
    }
    this.allowedProjects = new Set(allowedProjectIds);
  }

  private assertAllowed(projectId: string): void {
    if (!CHECKPOINT_PROJECT_ID.test(projectId) || !this.allowedProjects.has(projectId)) {
      throw new Error("PROJECT_CHECKPOINT_PROJECT_NOT_ALLOWED");
    }
  }

  private async call(operation: "saveCheckpoint" | "loadCheckpoint", payload: Record<string, unknown>): Promise<unknown> {
    const response = await this.stub.fetch("https://conchita-execution-state.internal/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, ...payload }),
    });
    if (!response.ok) throw new Error(`PROJECT_CHECKPOINT_DO_HTTP_${response.status}`);
    const body = await response.json() as { status?: string; error?: string; checkpoint?: unknown };
    if (body.status !== "OK") throw new Error(body.error ?? "PROJECT_CHECKPOINT_DO_REJECTED");
    return body.checkpoint ?? null;
  }

  async save(value: ProjectCheckpoint): Promise<void> {
    const checkpoint = normalizeProjectCheckpoint(value);
    this.assertAllowed(checkpoint.projectId);
    await this.call("saveCheckpoint", { projectId: checkpoint.projectId, checkpoint });
  }

  async load(projectId: string): Promise<ProjectCheckpoint | null> {
    this.assertAllowed(projectId);
    const value = await this.call("loadCheckpoint", { projectId });
    if (value === null) return null;
    return normalizeProjectCheckpoint(value, projectId);
  }
}
