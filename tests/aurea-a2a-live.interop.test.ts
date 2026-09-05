import { describe, expect, it } from "vitest";
import { createA2AExternalCodeCell } from "../src/aurea-a2a-external-code-cell";
import { ExternalCodeCellRuntime } from "../src/aurea-external-code-cell";
import { discoverA2AAgent } from "../src/aurea-a2a-agent-discovery";

const LIVE_AGENT_ORIGIN = "https://agentnative.cazimedia.com";

describe("A2A live interoperability", () => {
  it("discovers and executes against a public A2A v1 agent", async () => {
    const discovered = await discoverA2AAgent(LIVE_AGENT_ORIGIN);

    expect(discovered.protocolVersion).toBe("1.0");
    expect(["HTTP+JSON", "JSONRPC"]).toContain(discovered.protocolBinding);
    expect(discovered.endpoint).toMatch(/^https:\/\//);
    expect(discovered.agentCardUrl).toContain("/.well-known/agent-card.json");

    const adapter = createA2AExternalCodeCell({
      cellId: "aurea-live-a2a-interop",
      providerId: discovered.agentName ?? "agentnative",
      endpoint: discovered.endpoint,
      protocolBinding: discovered.protocolBinding,
      tenant: discovered.tenant,
    });

    const runtime = new ExternalCodeCellRuntime();
    runtime.register(adapter);

    const result = await runtime.execute({
      cellId: "aurea-live-a2a-interop",
      traceId: `aurea-live-${Date.now()}`,
      objective: "Find official datasets about public schools in Ecuador.",
      companyScope: "AUREA interoperability validation",
      projectScope: "A2A v1 live external agent test",
      responsibility: "Ask the remote agent for one bounded public-data search and return its response.",
      requiredCapabilities: ["a2a-v1", "public-data-search"],
      authorityLevel: "test-only",
      allowedKnowledge: ["The user-authorized live interoperability test"],
      restrictions: ["Do not publish or modify anything; return only the remote agent result."],
      dependencies: ["Public A2A v1 endpoint"],
      inputEvidence: ["Ecuador", "public schools"],
      expectedOutput: ["A non-empty response from the remote A2A agent"],
      validationCriteria: [
        "AUREA discovers a v1 Agent Card",
        "AUREA receives a successful A2A response",
        "AUREA returns non-empty remote output with protocol evidence",
      ],
    });

    expect(result.status, JSON.stringify(result)).toBe("COMPLETED");
    expect(result.result, JSON.stringify(result)).toBeTruthy();
    expect(result.evidence, JSON.stringify(result)).toContain("A2A_VERSION:1.0");
    expect(result.evidence.some((item) => item.startsWith("A2A_HTTP:")), JSON.stringify(result)).toBe(true);
    expect(result.evidence.some((item) => item.startsWith("A2A_ENDPOINT:")), JSON.stringify(result)).toBe(true);
    expect(result.evidence.some((item) => item.startsWith("A2A_BINDING:")), JSON.stringify(result)).toBe(true);
  }, 30_000);
});
