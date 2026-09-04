export type ConchitaChannel = "MOBILE_APP";
export type ConchitaMode = "PERSONAL" | "XOLAR";

export interface ConchitaSession {
  sessionId: string;
  userId: string;
  channel: ConchitaChannel;
  mode: ConchitaMode;
  createdAt: string;
}

export interface ConchitaMessageRequest {
  sessionId: string;
  userId: string;
  message: string;
  clientRequestId: string;
  mode?: ConchitaMode;
}

export interface ConchitaMessageResponse {
  sessionId: string;
  clientRequestId: string;
  traceId: string;
  status: "ACCEPTED" | "BLOCKED" | "COMPLETED";
  response?: string;
  evidence: string[];
  blockers: string[];
}

/**
 * Thin mobile boundary: the phone is a client, never the XOLAR/AUREA runtime.
 * Secrets, orchestration, knowledge, provider credentials and execution remain server-side.
 */
export interface ConchitaPersonalGateway {
  openSession(userId: string, mode: ConchitaMode): Promise<ConchitaSession>;
  sendMessage(request: ConchitaMessageRequest): Promise<ConchitaMessageResponse>;
  closeSession(sessionId: string): Promise<void>;
}

export function validateConchitaMessage(request: ConchitaMessageRequest): string[] {
  const blockers: string[] = [];
  if (!request.sessionId.trim()) blockers.push("SESSION_REQUIRED");
  if (!request.userId.trim()) blockers.push("USER_REQUIRED");
  if (!request.clientRequestId.trim()) blockers.push("CLIENT_REQUEST_ID_REQUIRED");
  if (!request.message.trim()) blockers.push("MESSAGE_REQUIRED");
  return blockers;
}
