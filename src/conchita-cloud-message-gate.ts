import type { ConchitaAuthenticatedPrincipal } from './conchita-authenticated-principal.js';
import type { ConchitaPwaRequest } from './conchita-pwa-request.js';
import type { ConchitaMessageRequest, ConchitaMessageResponse } from './conchita-personal-v0-contract.js';
import type { ConchitaPersonalV0Gateway } from './conchita-personal-v0-gateway.js';

export interface ConchitaCloudSessionAuthenticator {
  authenticate(sessionId: string): Promise<ConchitaAuthenticatedPrincipal | null>;
}

export interface ConchitaCloudMessageGateResult {
  accepted: boolean;
  response?: ConchitaMessageResponse;
  reason?: string;
}

export class ConchitaCloudMessageGate {
  constructor(private readonly authenticator: ConchitaCloudSessionAuthenticator, private readonly gateway: Pick<ConchitaPersonalV0Gateway, 'sendAuthenticatedMessage'>) {}

  async handle(request: ConchitaPwaRequest): Promise<ConchitaCloudMessageGateResult> {
    const sessionId = request.sessionId.trim();
    if (!sessionId || !request.message.trim() || !request.clientRequestId.trim()) return { accepted: false, reason: 'INVALID_TRANSPORT_REQUEST' };
    const principal = await this.authenticator.authenticate(sessionId);
    if (!principal) return { accepted: false, reason: 'AUTHENTICATION_REQUIRED' };
    const internalRequest: ConchitaMessageRequest = {
      sessionId,
      userId: principal.userId,
      message: request.message.trim(),
      clientRequestId: request.clientRequestId.trim(),
      ...(request.mode ? { mode: request.mode } : {}),
    };
    const response = await this.gateway.sendAuthenticatedMessage(principal, internalRequest);
    return { accepted: true, response };
  }
}
