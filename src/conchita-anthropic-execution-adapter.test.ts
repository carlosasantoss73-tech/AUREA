import { describe, expect, it, vi } from "vitest";
import { ConchitaAnthropicExecutionAdapter } from "./conchita-anthropic-execution-adapter.js";

describe("ConchitaAnthropicExecutionAdapter", () => {
  const provider = {
    providerId: "anthropic",
    modelId: "claude-test",
    status: "EXECUTABLE" as const,
    capabilities: ["conversation"],
    healthEvidence: ["CONFIGURED"]
  };

  it("calls the Anthropic HTTP contract without exposing the key in evidence", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("x-api-key")).toBe("secret-test-key");
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("claude-test");
      expect(body.messages[0]).toEqual({ role: "user", content: "Hola Conchita" });
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Hola. Soy Conchita." }] }), { status: 200 });
    });

    const adapter = new ConchitaAnthropicExecutionAdapter("anthropic", {
      apiKey: "secret-test-key",
      endpoint: "https://provider.test/v1/messages",
      fetchImpl,
    });

    const result = await adapter.execute({
      traceId: "trace-001",
      provider,
      input: { message: "Hola Conchita", mode: "PERSONAL" },
    });

    expect(result.output).toBe("Hola. Soy Conchita.");
    expect(result.evidence).toEqual([
      "PROVIDER_HTTP:anthropic",
      "PROVIDER_MODEL:claude-test",
      "TRACE:trace-001",
    ]);
    expect(result.evidence.join(" ")).not.toContain("secret-test-key");
  });

  it("fails closed on provider HTTP errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("upstream failure", { status: 503 }));
    const adapter = new ConchitaAnthropicExecutionAdapter("anthropic", { apiKey: "secret-test-key", fetchImpl });

    await expect(adapter.execute({ traceId: "trace-002", provider, input: { message: "test" } }))
      .rejects.toThrow("ANTHROPIC_HTTP_503:upstream failure");
  });

  it("rejects missing credentials before any HTTP call", () => {
    expect(() => new ConchitaAnthropicExecutionAdapter("anthropic", { apiKey: "" }))
      .toThrow("ANTHROPIC_API_KEY_REQUIRED");
  });
});
