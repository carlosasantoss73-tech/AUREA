import { describe, expect, it, vi } from "vitest";
import { createA2AExternalCodeCell } from "./aurea-a2a-external-code-cell";
import type { ExternalCodeCellRequest } from "./aurea-external-code-cell";

const request: ExternalCodeCellRequest = {
  cellId: "hyper-e3",
  traceId: "trace-e3",
  objective: "Return a bounded validation result",
  companyScope: "AUREA",
  projectScope: "hypervelocity",
  responsibility: "EXECUTION",
  requiredCapabilities: ["coding"],
  authorityLevel: "BRANCH_ONLY",
  allowedKnowledge: ["assigned repository files"],
  restrictions: ["no main writes", "no secrets in evidence"],
  dependencies: [],
  inputEvidence: ["E3 mission fixture"],
  expectedOutput: ["result", "evidence"],
  validationCriteria: ["non-empty result", "trace preserved"],
};

describe("A2A external code cell", () => {
  it("rejects non-HTTPS endpoints", () => {
    expect(() =>
      createA2AExternalCodeCell({
        cellId: "cell",
        providerId: "a2a-test",
        endpoint: "http://agent.example.com/v1/message:send",
      }),
    ).toThrow("A2A_EXTERNAL_CELL_HTTPS_REQUIRED");
  });

  it("sends a bounded A2A v1 mission and returns remote evidence", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("a2a-version")).toBe("1.0");
      const body = JSON.parse(String(init?.body)) as {
        message: { messageId: string; parts: Array<{ text: string }> };
      };
      expect(body.message.messageId).toBe(request.traceId);
      expect(body.message.parts[0]?.text).toContain("OBJECTIVE=Return a bounded validation result");
      return new Response(
        JSON.stringify({
          message: {
            messageId: "remote-message-1",
            parts: [{ text: "External agent completed the bounded mission." }],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const cell = createA2AExternalCodeCell({
      cellId: request.cellId,
      providerId: "a2a-test",
      endpoint: "https://agent.example.com/v1/message:send",
      bearerToken: "test-secret",
      fetchImpl,
    });

    const result = await cell.execute(request);

    expect(result.status).toBe("COMPLETED");
    expect(result.traceId).toBe(request.traceId);
    expect(result.cellId).toBe(request.cellId);
    expect(result.result).toContain("External agent completed");
    expect(result.evidence).toContain("A2A_VERSION:1.0");
    expect(result.evidence).toContain("A2A_MESSAGE:remote-message-1");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("fails closed on an empty remote response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ message: { messageId: "empty" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const cell = createA2AExternalCodeCell({
      cellId: request.cellId,
      providerId: "a2a-test",
      endpoint: "https://agent.example.com/v1/message:send",
      fetchImpl,
    });

    const result = await cell.execute(request);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("A2A_RESULT_EMPTY");
  });

  it("fails closed on malformed JSON from a successful response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const cell = createA2AExternalCodeCell({
      cellId: request.cellId,
      providerId: "a2a-test",
      endpoint: "https://agent.example.com/v1/message:send",
      fetchImpl,
    });

    const result = await cell.execute(request);

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("A2A_RESPONSE_MALFORMED_JSON");
  });
});
