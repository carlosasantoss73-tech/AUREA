import { describe, expect, it, vi } from "vitest";
import { ConchitaCloudMessageGate } from "./conchita-cloud-message-gate.js";

const request = {
  sessionId: "sess-1",
  message: "Hola Conchita",
  clientRequestId: "req-1",
  mode: "PERSONAL" as const,
};

describe("ConchitaCloudMessageGate", () => {
  it("does not trust browser userId and derives identity from the authenticated session", async () => {
    const gateway = { sendAuthenticatedMessage: vi.fn(async (_principal, internal) => ({
      requestId: internal.clientRequestId,
      traceId: "trace-1",
      status: "COMPLETED" as const,
      response: "ok",
    })) };
    const gate = new ConchitaCloudMessageGate(
      { authenticate: vi.fn(async () => ({ userId: "server-user", authenticationMethod: "SESSION" })) },
      gateway,
    );

    const result = await gate.handle(request);

    expect(result.accepted).toBe(true);
    expect(gateway.sendAuthenticatedMessage).toHaveBeenCalledWith(
      { userId: "server-user", authenticationMethod: "SESSION" },
      expect.objectContaining({ userId: "server-user" }),
    );
  });

  it("fails closed when the session cannot be authenticated", async () => {
    const gateway = { sendAuthenticatedMessage: vi.fn() };
    const gate = new ConchitaCloudMessageGate(
      { authenticate: vi.fn(async () => null) },
      gateway,
    );

    const result = await gate.handle(request);

    expect(result).toEqual({ accepted: false, reason: "AUTHENTICATION_REQUIRED" });
    expect(gateway.sendAuthenticatedMessage).not.toHaveBeenCalled();
  });

  it("rejects malformed transport input before authentication", async () => {
    const authenticate = vi.fn();
    const gateway = { sendAuthenticatedMessage: vi.fn() };
    const gate = new ConchitaCloudMessageGate({ authenticate }, gateway);

    const result = await gate.handle({ ...request, message: "   " });

    expect(result).toEqual({ accepted: false, reason: "INVALID_TRANSPORT_REQUEST" });
    expect(authenticate).not.toHaveBeenCalled();
  });
});
