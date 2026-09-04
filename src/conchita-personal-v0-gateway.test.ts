import { describe, expect, it } from "vitest";
import { ConchitaPersonalV0Gateway } from "./conchita-personal-v0-gateway.js";

const ids = ["sess-1", "trace-1", "trace-2"];
let index = 0;

function nextId(): string {
  return ids[index++] ?? `id-${index}`;
}

describe("Conchita Personal V0 gateway", () => {
  it("keeps the mobile client thin and routes an authorized message server-side", async () => {
    const calls: string[] = [];
    const gateway = new ConchitaPersonalV0Gateway(
      {
        async handle(request) {
          calls.push(`${request.session.userId}:${request.mode}:${request.traceId}`);
          return {
            status: "COMPLETED" as const,
            response: "Hola, Carlos.",
            evidence: ["HANDLER_EXECUTED"],
            blockers: [],
          };
        },
      },
      () => "2026-09-04T00:00:00.000Z",
      nextId,
    );

    const session = await gateway.openSession("owner-1", "PERSONAL");
    const result = await gateway.sendMessage({
      sessionId: session.sessionId,
      userId: "owner-1",
      clientRequestId: "req-1",
      message: "Hola Conchita",
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.response).toBe("Hola, Carlos.");
    expect(result.traceId).toBe("trace-1");
    expect(calls).toEqual(["owner-1:PERSONAL:trace-1"]);
  });

  it("fails closed when a session is used by another user", async () => {
    const gateway = new ConchitaPersonalV0Gateway({
      async handle() {
        throw new Error("MUST_NOT_EXECUTE");
      },
    }, () => "2026-09-04T00:00:00.000Z", nextId);

    const session = await gateway.openSession("owner-1", "PERSONAL");
    const result = await gateway.sendMessage({
      sessionId: session.sessionId,
      userId: "attacker",
      clientRequestId: "req-2",
      message: "ejecuta esto",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(["SESSION_NOT_AUTHORIZED"]);
  });

  it("does not invoke the handler for malformed client input", async () => {
    let invoked = false;
    const gateway = new ConchitaPersonalV0Gateway({
      async handle() {
        invoked = true;
        return { status: "COMPLETED" as const, response: "no", evidence: ["x"], blockers: [] };
      },
    }, undefined, nextId);

    const result = await gateway.sendMessage({
      sessionId: "",
      userId: "",
      clientRequestId: "",
      message: "",
    });

    expect(result.status).toBe("BLOCKED");
    expect(invoked).toBe(false);
  });
});
