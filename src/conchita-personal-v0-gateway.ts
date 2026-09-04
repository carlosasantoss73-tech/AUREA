import type {
  ConchitaMessageRequest,
  ConchitaMessageResponse,
  ConchitaMode,
  ConchitaPersonalGateway,
  ConchitaSession,
} from './conchita-personal-v0-contract.js';
import { validateConchitaMessage } from './conchita-personal-v0-contract.js';
import type { ConchitaSessionStore } from './conchita-cloud-session-store.js';
import {
  validateConchitaPrincipal,
  type ConchitaAuthenticatedPrincipal,
} from './conchita-authenticated-principal.js';

export interface ConchitaPersonalRequestHandler {
  handle(request: {
    session: ConchitaSession;
    message: string;
    mode: ConchitaMode;
    traceId: string;
  }): Promise<Pick<ConchitaMessageResponse, 'status' | 'response' | 'evidence' | 'blockers'>>;
}

export class ConchitaPersonalV0Gateway implements ConchitaPersonalGateway {
  constructor(
    private readonly handler: ConchitaPersonalRequestHandler,
    private readonly sessions: ConchitaSessionStore,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async openSession(userId: string, mode: ConchitaMode): Promise<ConchitaSession> {
    if (!userId.trim()) throw new Error('USER_REQUIRED');
    const session: ConchitaSession = {
      sessionId: this.id(), userId: userId.trim(), channel: 'MOBILE_APP', mode, createdAt: this.now(),
    };
    this.sessions.save(session);
    return { ...session };
  }

  async sendAuthenticatedMessage(
    principal: ConchitaAuthenticatedPrincipal | undefined,
    request: ConchitaMessageRequest,
  ): Promise<ConchitaMessageResponse> {
    const principalBlockers = validateConchitaPrincipal(principal);
    if (principalBlockers.length) return this.blocked(request, principalBlockers);

    const validation = validateConchitaMessage(request);
    if (validation.length) return this.blocked(request, validation);

    const session = this.sessions.get(request.sessionId);
    if (!session || !this.sessions.isActive(request.sessionId)) {
      return this.blocked(request, ['SESSION_NOT_ACTIVE']);
    }
    if (session.userId !== principal!.userId) {
      return this.blocked(request, ['SESSION_PRINCIPAL_MISMATCH']);
    }

    const traceId = this.id();
    const mode = request.mode ?? session.mode;
    const result = await this.handler.handle({
      session: { ...session, mode },
      message: request.message.trim(), mode, traceId,
    });
    return {
      sessionId: session.sessionId,
      clientRequestId: request.clientRequestId,
      traceId,
      status: result.status,
      response: result.response,
      evidence: [...new Set(result.evidence)],
      blockers: [...result.blockers],
    };
  }

  async sendMessage(request: ConchitaMessageRequest): Promise<ConchitaMessageResponse> {
    // Legacy entry point deliberately fails closed: callers must authenticate first.
    return this.sendAuthenticatedMessage(undefined, request);
  }

  async closeSession(sessionId: string): Promise<void> {
    this.sessions.revoke(sessionId);
  }

  private blocked(request: ConchitaMessageRequest, blockers: string[]): ConchitaMessageResponse {
    return {
      sessionId: request.sessionId ?? '',
      clientRequestId: request.clientRequestId ?? '',
      traceId: 'BLOCKED', status: 'BLOCKED',
      evidence: ['CONCHITA_GATEWAY_SECURITY'], blockers,
    };
  }
}
