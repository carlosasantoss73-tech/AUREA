import type { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import { composeEcpContext } from "./context-pipeline.js";
import { appendEcpExpedientIntake, intakeEcpExpedient, type EcpExpedientDocumentInput, type EcpExpedientIntakeInput } from "./expedient-intake.js";
import type { EcpExpedientStore, EcpStoredExpedient } from "./expedient-store.js";
import type { EcpAnalysisResult } from "./expedient-analysis-runtime.js";

export interface EcpAuthenticatedPrincipal { clientId: string; actorId: string; actorRole: string; }
export interface EcpExpedientHttpDependencies {
  authenticate(request: Request): Promise<EcpAuthenticatedPrincipal | null>;
  store: EcpExpedientStore;
  contextGate: Pick<ContextRetrievalGate, "retrieve">;
  analyze?(record: EcpStoredExpedient, principal: EcpAuthenticatedPrincipal): Promise<EcpAnalysisResult>;
  now?: () => Date;
  randomId?: () => string;
}

type ApiDocument = Omit<EcpExpedientDocumentInput, "bytes" | "projectId"> & { contentBase64: string };
type ApiIntake = { metadata: EcpExpedientIntakeInput["metadata"]; documents: ApiDocument[] };
type ApiAppend = { documents: ApiDocument[] };
const MAX_REQUEST_BYTES = 28 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function decodeBase64(value: unknown): Uint8Array {
  if (typeof value !== "string" || !value.trim()) throw new Error("ECP_API_DOCUMENT_CONTENT_REQUIRED");
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch { throw new Error("ECP_API_DOCUMENT_CONTENT_INVALID"); }
}
function safeId(value: string): string { return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80); }
function summary(intake: Awaited<ReturnType<typeof intakeEcpExpedient>>) {
  return { projectId: intake.projectId, metadata: intake.metadata, readiness: intake.readiness, blockers: intake.blockers, warnings: intake.warnings, offerors: intake.offerors, totalChunks: intake.totalChunks, documents: intake.documents.map(({ role, offeror, ingestion }) => ({ role, offeror, documentId: ingestion.documentId, title: ingestion.title, mediaType: ingestion.mediaType, sourceVersion: ingestion.sourceVersion, sourceUnits: ingestion.sourceUnits, extractedUnits: ingestion.extractedUnits, chunks: ingestion.chunks.length })) };
}

/**
 * ECP's authenticated HTTP boundary. It stores traceable extracted evidence
 * under the authenticated client's namespace; it never stores raw credentials
 * or lets a caller choose another client's namespace. Analysis remains blocked
 * until the existing institutional Context Retrieval Gate returns READY.
 */
export function createEcpExpedientHttpHandler(deps: EcpExpedientHttpDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    const principal = await deps.authenticate(request);
    if (!principal?.clientId.trim() || !principal.actorId.trim() || !principal.actorRole.trim()) return json({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" }, 401);
    const url = new URL(request.url);
    const match = /^\/ecp\/v1\/expedients(?:\/([a-zA-Z0-9_-]{1,80})(?:\/(analysis-readiness|documents|analyze))?)?$/.exec(url.pathname);
    if (!match) return json({ status: "BLOCKED", error: "NOT_FOUND" }, 404);
    if (request.method === "POST" && !match[1]) return createIntake(request, principal, deps);
    if (request.method === "GET" && match[1] && !match[2]) return readIntake(match[1], principal, deps);
    if (request.method === "POST" && match[1] && match[2] === "documents") return appendDocuments(request, match[1], principal, deps);
    if (request.method === "POST" && match[1] && match[2] === "analysis-readiness") return analysisReadiness(match[1], principal, deps);
    if (request.method === "POST" && match[1] && match[2] === "analyze") return analyzeExpedient(match[1], principal, deps);
    return json({ status: "BLOCKED", error: "METHOD_NOT_ALLOWED" }, 405);
  };
}

async function createIntake(request: Request, principal: EcpAuthenticatedPrincipal, deps: EcpExpedientHttpDependencies): Promise<Response> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json({ status: "BLOCKED", error: "JSON_REQUIRED" }, 415);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BYTES) return json({ status: "BLOCKED", error: "REQUEST_TOO_LARGE" }, 413);
  let parsed: ApiIntake;
  try { parsed = JSON.parse(new TextDecoder().decode(body)) as ApiIntake; } catch { return json({ status: "BLOCKED", error: "INVALID_JSON" }, 400); }
  if (!parsed || !Array.isArray(parsed.documents)) return json({ status: "BLOCKED", error: "INVALID_INTAKE_REQUEST" }, 400);
  try {
    const documents = parsed.documents.map(({ contentBase64, ...document }) => ({ ...document, projectId: "ecp", bytes: decodeBase64(contentBase64) }));
    const intake = await intakeEcpExpedient({ metadata: parsed.metadata, documents });
    const rawId = deps.randomId?.() ?? crypto.randomUUID();
    const expedientId = safeId(rawId);
    if (!expedientId) throw new Error("ECP_API_EXPEDIENT_ID_INVALID");
    await deps.store.save({ clientId: principal.clientId, expedientId, createdAt: (deps.now?.() ?? new Date()).toISOString(), intake });
    return json({ status: "ACCEPTED", expedientId, intake: summary(intake) }, 201);
  } catch (error) { return json({ status: "BLOCKED", error: error instanceof Error ? error.message : "ECP_INTAKE_FAILED" }, 422); }
}
async function readIntake(expedientId: string, principal: EcpAuthenticatedPrincipal, deps: EcpExpedientHttpDependencies): Promise<Response> {
  const record = await deps.store.get(principal.clientId, expedientId);
  if (!record) return json({ status: "BLOCKED", error: "EXPEDIENT_NOT_FOUND" }, 404);
  return json({ status: "COMPLETED", expedientId: record.expedientId, createdAt: record.createdAt, intake: summary(record.intake) });
}
async function analysisReadiness(expedientId: string, principal: EcpAuthenticatedPrincipal, deps: EcpExpedientHttpDependencies): Promise<Response> {
  const record = await deps.store.get(principal.clientId, expedientId);
  if (!record) return json({ status: "BLOCKED", error: "EXPEDIENT_NOT_FOUND" }, 404);
  if (record.intake.readiness !== "READY_FOR_EVIDENCE_REVIEW") return json({ status: "BLOCKED", error: "ECP_EXPEDIENT_INTAKE_INCOMPLETE", blockers: record.intake.blockers }, 409);
  try {
    const retrieval = await deps.contextGate.retrieve({ actorId: principal.actorId, actorRole: principal.actorRole, institutionalOnly: true, projectId: "ecp", query: `${record.intake.metadata.procedureCode} ${record.intake.metadata.objectDescription}`, allowedProjects: ["ecp"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"] });
    const composed = composeEcpContext(retrieval, "ecp");
    if (composed.status !== "READY") return json({ status: "BLOCKED", error: "ECP_INSTITUTIONAL_CONTEXT_BLOCKED", blockers: composed.blockers, traceId: composed.traceId }, 409);
    return json({ status: "READY_FOR_CONTROLLED_EXECUTION", expedientId, traceId: composed.traceId, contextSources: composed.pack?.sources.map((source) => ({ documentId: source.documentId, version: source.version })) ?? [] });
  } catch (error) { return json({ status: "BLOCKED", error: error instanceof Error ? error.message : "ECP_CONTEXT_RETRIEVAL_FAILED" }, 503); }
}

async function appendDocuments(request: Request, expedientId: string, principal: EcpAuthenticatedPrincipal, deps: EcpExpedientHttpDependencies): Promise<Response> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json({ status: "BLOCKED", error: "JSON_REQUIRED" }, 415);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BYTES) return json({ status: "BLOCKED", error: "REQUEST_TOO_LARGE" }, 413);
  let parsed: ApiAppend;
  try { parsed = JSON.parse(new TextDecoder().decode(body)) as ApiAppend; } catch { return json({ status: "BLOCKED", error: "INVALID_JSON" }, 400); }
  if (!parsed || !Array.isArray(parsed.documents) || parsed.documents.length === 0) return json({ status: "BLOCKED", error: "INVALID_APPEND_REQUEST" }, 400);
  const existing = await deps.store.get(principal.clientId, expedientId);
  if (!existing) return json({ status: "BLOCKED", error: "EXPEDIENT_NOT_FOUND" }, 404);
  try {
    const documents = parsed.documents.map(({ contentBase64, ...document }) => ({ ...document, projectId: "ecp", bytes: decodeBase64(contentBase64) }));
    const intake = await appendEcpExpedientIntake(existing.intake, documents);
    const updated = { ...existing, intake };
    await deps.store.save(updated);
    return json({ status: "UPDATED", expedientId, intake: summary(intake) });
  } catch (error) { return json({ status: "BLOCKED", error: error instanceof Error ? error.message : "ECP_APPEND_FAILED" }, 422); }
}


async function analyzeExpedient(expedientId: string, principal: EcpAuthenticatedPrincipal, deps: EcpExpedientHttpDependencies): Promise<Response> {
  const record = await deps.store.get(principal.clientId, expedientId);
  if (!record) return json({ status: "BLOCKED", error: "EXPEDIENT_NOT_FOUND" }, 404);
  if (record.intake.readiness !== "READY_FOR_EVIDENCE_REVIEW") {
    return json({ status: "BLOCKED", error: "ECP_EXPEDIENT_INTAKE_INCOMPLETE", blockers: record.intake.blockers }, 409);
  }
  if (!deps.analyze) return json({ status: "BLOCKED", error: "ECP_ANALYSIS_RUNTIME_NOT_CONFIGURED" }, 503);
  try {
    const result = await deps.analyze(record, principal);
    const status = result.status === "SUCCEEDED" || result.status === "REPLAYED" ? 200
      : result.status === "BLOCKED" ? 409 : 502;
    return json({ ...result, expedientId }, status);
  } catch (error) {
    return json({ status: "BLOCKED", error: error instanceof Error ? error.message : "ECP_ANALYSIS_FAILED" }, 503);
  }
}
