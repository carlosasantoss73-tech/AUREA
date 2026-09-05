import { describe, expect, it, vi } from "vitest";
import { discoverA2AAgent } from "./aurea-a2a-agent-discovery";

describe("A2A Agent Card discovery", () => {
  it("rejects non-HTTPS discovery roots", async () => {
    await expect(discoverA2AAgent("http://agent.example.com")).rejects.toThrow(
      "A2A_DISCOVERY_HTTPS_REQUIRED",
    );
  });

  it("discovers the HTTPS HTTP+JSON v1.0 interface", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe("https://agent.example.com/.well-known/agent-card.json");
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("a2a-version")).toBe("1.0");
      return new Response(
        JSON.stringify({
          name: "Example Agent",
          version: "1.2.3",
          capabilities: { streaming: false },
          skills: [{ id: "bounded-validation" }],
          securitySchemes: {},
          supportedInterfaces: [
            {
              url: "https://agent.example.com/a2a",
              protocolBinding: "HTTP+JSON",
              protocolVersion: "1.0",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/a2a+json" } },
      );
    });

    const discovered = await discoverA2AAgent(
      "https://agent.example.com",
      fetchImpl,
    );

    expect(discovered.endpoint).toBe("https://agent.example.com/a2a");
    expect(discovered.protocolBinding).toBe("HTTP+JSON");
    expect(discovered.protocolVersion).toBe("1.0");
    expect(discovered.agentName).toBe("Example Agent");
    expect(discovered.skills).toHaveLength(1);
  });

  it("ignores unsupported interfaces when a valid HTTP+JSON v1.0 interface exists", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          supportedInterfaces: [
            { url: "https://agent.example.com/grpc", protocolBinding: "GRPC", protocolVersion: "1.0" },
            { url: "https://agent.example.com/jsonrpc", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
            { url: "https://agent.example.com/a2a", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" },
          ],
        }),
        { status: 200 },
      ),
    );

    const discovered = await discoverA2AAgent("https://agent.example.com", fetchImpl);
    expect(discovered.endpoint).toBe("https://agent.example.com/a2a");
  });

  it("fails closed when no HTTP+JSON v1.0 interface is advertised", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          supportedInterfaces: [
            { url: "https://agent.example.com/jsonrpc", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
            { url: "https://agent.example.com/a2a", protocolBinding: "HTTP+JSON", protocolVersion: "0.9" },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(discoverA2AAgent("https://agent.example.com", fetchImpl)).rejects.toThrow(
      "A2A_DISCOVERY_HTTP_JSON_V1_UNSUPPORTED",
    );
  });

  it("fails closed on malformed Agent Card JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("not-json", { status: 200 }));

    await expect(discoverA2AAgent("https://agent.example.com", fetchImpl)).rejects.toThrow(
      "A2A_DISCOVERY_MALFORMED_JSON",
    );
  });

  it("fails closed when the discovered interface is not HTTPS", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          supportedInterfaces: [
            { url: "http://agent.example.com/a2a", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(discoverA2AAgent("https://agent.example.com", fetchImpl)).rejects.toThrow(
      "A2A_DISCOVERY_ENDPOINT_HTTPS_REQUIRED",
    );
  });

  it("fails closed on an invalid Agent Card shape", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ name: "No interfaces" }), { status: 200 }),
    );

    await expect(discoverA2AAgent("https://agent.example.com", fetchImpl)).rejects.toThrow(
      "A2A_DISCOVERY_CARD_INVALID",
    );
  });

  it("fails closed on HTTP discovery errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("not found", { status: 404 }));

    await expect(discoverA2AAgent("https://agent.example.com", fetchImpl)).rejects.toThrow(
      "A2A_DISCOVERY_HTTP_ERROR:404",
    );
  });
});
