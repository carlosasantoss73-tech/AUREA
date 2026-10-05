/**
 * Regression coverage for the A2A v1 HTTP+JSON REST binding.
 */
import { describe, expect, it, vi } from "vitest";
import { createA2AExternalCodeCell } from "../src/aurea-a2a-external-code-cell";

const request = {
  cellId: "a2a-test",
  traceId: "trace-1",
  objective: "Read one bounded public result",
  companyScope: "AUREA",
  projectScope: "A2A test",
  responsibility: "Execute a read-only request",
  requiredCapabilities: ["a2a-v1"],
  authorityLevel: "test-only",
  allowedKnowledge: ["public test"],
  restrictions: ["read-only"],
  dependencies: ["public A2A agent"],
  inputEvidence: ["test"],
  expectedOutput: ["non-empty result"],
  validationCriteria: ["completed"],
};

describe("A2A HTTP+JSON v1 REST adapter", () => {
  it("posts SendMessage to the REST operation path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          task: {
            id: "task-1",
            status: { state: "TASK_STATE_COMPLETED" },
            artifacts: [{ parts: [{ text: "remote result" }] }],
          },
        }),
        { status: 200, headers: { "content-type": "application/a2a+json" } },
      ),
    );

    const adapter = createA2AExternalCodeCell({
      cellId: "a2a-test",
      providerId: "remote",
      endpoint: "https://hotline.papilov.org/a2a/rest",
      fetchImpl: fetchMock,
    });

    const result = await adapter.execute(request);

    expect(result.status).toBe("COMPLETED");
    expect(result.result).toBe("remote result");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hotline.papilov.org/a2a/rest/message:send");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "content-type": "application/a2a+json",
      "a2a-version": "1.0",
    });
  });
});
