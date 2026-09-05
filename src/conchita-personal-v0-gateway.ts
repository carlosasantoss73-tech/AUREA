import type { ConchitaMessageRequest, ConchitaMessageResponse, ConchitaMode, ConchitaPersonalGateway, ConchitaSession } from './conchita-personal-v0-contract.js';
import { validateConchitaMessage } from './conchita-personal-v0-contract.js';
import type { ConchitaSessionStore } from './conchita-cloud-session-store.js';
import type { ConchitaDurableSessionRepository } from './conchita-cloud-kv-session-store.js';
import { validateConchitaPrincipal, type ConchitaAuthenticatedPrincipal } from './conchita-authenticated-principal.js';

export interface ConchitaPersonalRequestHandler {
  handle(request: { session: ConchitaSession; message: string; mode: ConchitaMode; traceId: string }): Promise<Pick<ConchitaMessageResponse, 'status' | 'response' | 'evidence' | 'blockers'>>;
}

type ConchitaSessionBackend = ConchitaSessionStore | ConchitaDurableSessionRepository;
type TraceForRequest = (sessionId: string, clientRequestId: string) => string | Promise<string>;

export async function conchitaExecutionTraceId(sessionId: string, clientRequestId: string): Promise<string> {
  const source = new TextEncoder().encode(`${sessionId}:${clientRequestId}`);
  const digest = await crypto.subtle.digest('SHA-256', source);
  return `client-${Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export class ConchitaPersonalV0Gateway implements ConchitaPersonalGateway {
  constructor(
    private readonly handler: ConchitaPersonalRequestHandler,
    private readonly sessions: ConchitaSessionBackend,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly id: () => string = () => crypto.randomUUID(),
    private readonly traceForRequest?: TraceForRequest,
  ) {}

  async openSession(userId: string, mode: ConchitaMode): Promise<ConchitaSession> {
    if (!userId.trim()) throw new Error('USER_REQUIRED');
    const session: ConchitaSession = { sessionId: this.id(), userId: userId.trim(), channel: 'MOBILE_APP', mode, createdAt: this.now() };
    await this.saveSession(session);
    return { ...session };
  }

  async sendAuthenticatedMessage(principal: ConchitaAuthenticatedPrincipal | undefined, request: ConchitaMessageRequest): Promise<ConchitaMessageResponse> {
    const principalBlockers = validateConchitaPrincipal(principal);
    if (principalBlockers.length) return this.blocked(request, principalBlockers);
    const validation = validateConchitaMessage(request);
    if (validation.length) return this.blocked(request, validation);
    const session = await this.getSession(request.sessionId);
    const active = session ? await this.isSessionActive(request.sessionId) : false;
    if (!session || !active) return this.blocked(request, ['SESSION_NOT_ACTIVE']);
    if (session.userId !== principal!.userId) return this.blocked(request, ['SESSION_PRINCIPAL_MISMATCH']);
    const traceId = this.traceForRequest
      ? await this.traceForRequest(session.sessionId, request.clientRequestId)
      : this.id();
    const mode = request.mode ?? session.mode;
    const result = await this.handler.handle({ session: { ...session, mode }, message: request.message.trim(), mode, traceId });
    return { sessionId: session.sessionId, clientRequestId: request.clientRequestId, traceId, status: result.status, response: result.response, evidence: [...new Set(result.evidence)], blockers: [...result.blockers] };
  }

  async sendMessage(request: ConchitaMessageRequest): Promise<ConchitaMessageResponse> { return this.sendAuthenticatedMessage(undefined, request); }
  async closeSession(sessionId: string): Promise<void> { await this.revokeSession(sessionId); }
  private async getSession(sessionId: string): Promise<ConchitaSession | undefined> { return await Promise.resolve(this.sessions.get(sessionId)); }
  private async saveSession(session: ConchitaSession): Promise<void> { await Promise.resolve(this.sessions.save(session)); }
  private async revokeSession(sessionId: string): Promise<boolean> { return await Promise.resolve(this.sessions.revoke(sessionId)); }
  private async isSessionActive(sessionId: string): Promise<boolean> { return await Promise.resolve(this.sessions.isActive(sessionId)); }
  private blocked(request: ConchitaMessageRequest, blockers: string[]): ConchitaMessageResponse { return { sessionId: request.sessionId ?? '', clientRequestId: request.clientRequestId ?? '', traceId: 'BLOCKED', status: 'BLOCKED', evidence: ['CONCHITA_GATEWAY_SECURITY'], blockers }; }
}
