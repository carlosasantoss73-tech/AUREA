import { describe, expect, it, vi } from "vitest";
import { ConchitaPersonalV0Gateway } from "./conchita-personal-v0-gateway.js";

describe("Conchita gateway authenticated boundary", () => {
  it("blocks missing authenticated principal before invoking the handler", async () => {
    const handler = { handle: vi.fn() };
    const gateway = new ConchitaPersonalV0Gateway(handler);
    const result = await gateway.sendAuthenticatedMessage(undefined, {
      sessionId: "s1", userId: "u1", message: "hola", clientRequestId: "r1",
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("AUTHENTICATED_PRINCIPAL_REQUIRED");
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it("uses the authenticated principal rather than trusting request userId", async () => {
    const handler = { handle: vi.fn().mockResolvedValue({ status: "COMPLETED", response: "ok", evidence: ["e"], blockers: [] }) };
    const gateway = new ConchitaPersonalV0Gateway(handler, () => "2026-09-04T00:00:00.000Z", () => "trace-1");
    await gateway.openSession("u1", "PERSONAL");

    const result = await gateway.sendAuthenticatedMessage(
      { userId: "u1", authenticationMethod: "session-cookie" },
      { sessionId: "trace-1", userId: "attacker", message: "hola", clientRequestId: "r1" },
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(["SESSION_NOT_AUTHORIZED"]);
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
