export interface ConchitaPwaRequest {
  sessionId: string;
  message: string;
  clientRequestId: string;
  mode?: "PERSONAL" | "XOLAR";
}

export function buildConchitaPwaRequest(
  sessionId: string,
  message: string,
  clientRequestId: string,
  mode: "PERSONAL" | "XOLAR" = "PERSONAL",
): ConchitaPwaRequest {
  return {
    sessionId: sessionId.trim(),
    message: message.trim(),
    clientRequestId: clientRequestId.trim(),
    mode,
  };
}
