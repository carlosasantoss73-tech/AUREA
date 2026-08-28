/** AUREA B14 — Automatic Context Retrieval Gate. */
import { evaluatePermission, PermissionRequest } from "../security/permission-gateway";

export type ContextRetrievalStatus = "NOT_NEEDED" | "READY" | "EMPTY" | "BLOCKED";
export interface ContextCitation { sourceId: string; documentId?: string; version?: number; title?: string; excerpt?: string; }
export interface RetrievedContext { query: string; projectId: string; citations: ContextCitation[]; facts: string[]; }
export interface ContextRetrievalResult { traceId: string; status: ContextRetrievalStatus; reason: string; context?: RetrievedContext; }
export interface ContextProvider { retrieve(input: { projectId: string; query: string; traceId: string }): Promise<RetrievedContext>; }
export interface ContextRetrievalRequest { actorId: string; actorRole: string; projectId: string; query: string; allowedProjects?: string[]; allowedCapabilities?: string[]; allowedTools?: string[]; }

const CONTINUITY_PATTERNS = [
  /\b(ayer|antes|anterior|previamente|semana|esta semana|estos días|últim[oa]s días)\b/i,
  /\b(recordar|recuerda|recupera|recuperar|hablamos|trabajamos|hicimos|creamos|quedamos|continuemos)\b/i,
  /\b(como dijiste|como vimos|como hicimos|lo que hicimos|lo anterior|el trabajo anterior)\b/i,
  /\b(previous|previously|last week|this week|earlier|before|we discussed|we worked on)\b/i,
];

export function requiresHistoricalContext(query: string): boolean {
  const normalized = query.trim();
  return Boolean(normalized) && CONTINUITY_PATTERNS.some(pattern => pattern.test(normalized));
}

export class ContextRetrievalGate {
  constructor(private readonly provider: ContextProvider) {}
  async retrieve(request: ContextRetrievalRequest): Promise<ContextRetrievalResult> {
    const traceId = crypto.randomUUID();
    const historical = requiresHistoricalContext(request.query);
    const permissionRequest: PermissionRequest = {
      actorId: request.actorId, actorRole: request.actorRole, projectId: request.projectId,
      capabilityId: "knowledge.read", toolId: "knowledge.search", action: "retrieve_context", effectClass: "READ",
      allowedProjects: request.allowedProjects, allowedCapabilities: request.allowedCapabilities, allowedTools: request.allowedTools,
    };
    const permission = evaluatePermission(permissionRequest, traceId);
    if (!["ALLOW", "ALLOW_WITH_LIMITS"].includes(permission.decision)) return { traceId, status: "BLOCKED", reason: permission.reason };
    const context = await this.provider.retrieve({ projectId: request.projectId, query: request.query, traceId });
    if (!context.citations.length && !context.facts.length) {
      return historical
        ? { traceId, status: "EMPTY", reason: "HISTORICAL_CONTEXT_NOT_FOUND" }
        : { traceId, status: "NOT_NEEDED", reason: "NO_RELEVANT_CONTEXT_FOUND" };
    }
    return { traceId, status: "READY", reason: historical ? "HISTORICAL_CONTEXT_RETRIEVED" : "RELEVANT_CONTEXT_RETRIEVED", context };
  }
}
