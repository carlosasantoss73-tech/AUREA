import { describe, expect, it } from "vitest";
import { createA2AExternalCodeCell } from "../src/aurea-a2a-external-code-cell";
import { ExternalCodeCellRuntime } from "../src/aurea-external-code-cell";
import { discoverA2AAgent } from "../src/aurea-a2a-agent-discovery";

const LIVE_AGENT_ORIGIN = "https://api.agentbounties.app";
const RUN_LIVE_A2A = process.env.AUREA_LIVE_A2A === "1";

describe("A2A live interoperability", () => {
  it.skipIf(!RUN_LIVE_A2A)("discovers and executes against a public A2A v1 HTTP+JSON agent", async () => {
    const discovered = await discoverA2AAgent(LIVE_AGENT_ORIGIN);

    expect(discovered.protocolBinding).toBe("HTTP+JSON");
    expect(discovered.protocolVersion).toBe("1.0");
    expect(discovered.endpoint).toMatch(/^https:\/\//);
    expect(discovered.agentCardUrl).toContain("/.well-known/agent-card.json");

    const adapter = createA2AExternalCodeCell({
      cellId: "aurea-live-a2a-interop",
      providerId: discovered.agentName ?? "public-a2a-agent",
      endpoint: discovered.endpoint,
      tenant: discovered.tenant,
    });

    const runtime = new ExternalCodeCellRuntime();
    runtime.register(adapter);

    const result = await runtime.execute({
      cellId: "aurea-live-a2a-interop",
      traceId: `aurea-live-${Date.now()}`,
      objective: "Use the remote public A2A agent to execute one read-only discovery operation and return its result.",
      companyScope: "AUREA interoperability validation",
      projectScope: "A2A v1 live external agent test",
      responsibility: "Execute one bounded read-only discovery request and return the remote result.",
      requiredCapabilities: ["a2a-v1"],
      authorityLevel: "test-only",
      allowedKnowledge: ["The user-authorized live interoperability test"],
      restrictions: ["Do not recommend anything; return only the remote agent result."],
      dependencies: ["Public A2A v1 HTTP+JSON endpoint", "Remote read-only discovery skill"],
      inputEvidence: ["Public Agent Bounties A2A 1.0 interface"],
      expectedOutput: ["A non-empty response from the remote A2A agent"],
      validationCriteria: [
        "AUREA discovers a v1 HTTP+JSON Agent Card",
        "AUREA receives a successful A2A response",
        "AUREA returns non-empty remote output with protocol evidence",
      ],
    });

    if (result.status !== "COMPLETED") {
      throw new Error(`A2A_LIVE_BLOCKED ${JSON.stringify(result.evidence)}`);
    }
    expect(result.status).toBe("COMPLETED");
    expect(result.result).toBeTruthy();
    expect(result.evidence).toContain("A2A_VERSION:1.0");
    expect(result.evidence.some((item) => item.startsWith("A2A_HTTP:"))).toBe(true);
    expect(result.evidence.some((item) => item.startsWith("A2A_ENDPOINT:"))).toBe(true);
  }, 30_000);
});
