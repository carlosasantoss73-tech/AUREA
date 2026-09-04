import type { ConchitaMode } from './conchita-personal-v0-contract.js';

/** Browser transport request. Identity is intentionally absent: the server derives it. */
export interface ConchitaPwaRequest {
  sessionId: string;
  message: string;
  clientRequestId: string;
  mode?: ConchitaMode;
}

export function buildConchitaPwaRequest(input: Omit<ConchitaPwaRequest, 'message'> & { message: string }): ConchitaPwaRequest {
  return {
    sessionId: input.sessionId.trim(),
    message: input.message.trim(),
    clientRequestId: input.clientRequestId.trim(),
    ...(input.mode ? { mode: input.mode } : {}),
  };
}
