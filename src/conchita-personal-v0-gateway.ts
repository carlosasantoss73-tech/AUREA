import {
  ConchitaMessageRequest,
  ConchitaMessageResponse,
  ConchitaMode,
  ConchitaPersonalGateway,
  ConchitaSession,
  validateConchitaMessage,
} from "./conchita-personal-v0-contract.js";

export interface ConchitaPersonalRequestHandler {
  handle(request: {
    session: ConchitaSession;
    message: string;
    mode: ConchitaMode;
    traceId: string;
  }): Promise<Pick<ConchitaMessageResponse, "status" | "response" | "evidence" | "blockers">>;
}

/**
 * Server-side gateway for the thin Conchita mobile client.
 * The client supplies identity/session references only; execution authority,
 * provider credentials and orchestration stay behind the injected handler.
 */
export class ConchitaPersonalV0Gateway implements ConchitaPersonalGateway {
  private readonly sessions = new Map<string, ConchitaSession>();

  constructor(
    private readonly handler: ConchitaPersonalRequestHandler,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async openSession(userId: string, mode: ConchitaMode): Promise<ConchitaSession> {
    if (!userId.trim()) throw new Error("USER_REQUIRED");
    const session: ConchitaSession = {
      sessionId: this.id(),
      userId,
      channel: "MOBILE_APP",
      mode,
      createdAt: this.now(),
    };
    this.sessions.set(session.sessionId, session);
    return { ...session };
  }

  async sendMessage(request: ConchitaMessageRequest): Promise<ConchitaMessageResponse> {
    const validation = validateConchitaMessage(request);
    if (validation.length > 0) {
      return {
        sessionId: request.sessionId,
        clientRequestId: request.clientRequestId,
        traceId: "BLOCKED",
        status: "BLOCKED",
        evidence: ["CONCHITA_GATEWAY_VALIDATION"],
        blockers: validation,
      };
    }

    const session = this.sessions.get(request.sessionId);
    if (!session || session.userId !== request.userId) {
      return {
        sessionId: request.sessionId,
        clientRequestId: request.clientRequestId,
        traceId: "BLOCKED",
        status: "BLOCKED",
        evidence: ["CONCHITA_SESSION_AUTHORIZATION"],
        blockers: ["SESSION_NOT_AUTHORIZED"],
      };
    }

    const traceId = this.id();
    const mode = request.mode ?? session.mode;
    const result = await this.handler.handle({
      session: { ...session, mode },
      message: request.message.trim(),
      mode,
      traceId,
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

  async closeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
