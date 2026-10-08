import { describe, expect, it } from "vitest";
import { GovernedRadarReachGateway, RadarEvidence, RadarReachAdapter } from "./aurea-radar-reach";

const evidence: RadarEvidence = {
  source: "WEB",
  sourceId: "example-1",
  capturedAt: "2026-08-29T00:00:00Z",
  title: "Example capability",
  uri: "https://example.com/capability",
  observedClaims: ["claim"],
  state: "VERIFIED",
};

const adapter: RadarReachAdapter = {
  id: "web.example",
  source: "WEB",
  async discover() { return [evidence]; },
};

describe("GovernedRadarReachGateway", () => {
  it("captures evidence without activating it", async () => {
    const gateway = new GovernedRadarReachGateway([adapter]);
    const result = await gateway.discover({ query: "new capability", sources: ["WEB"] });
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe("CAPTURED");
  });

  it("rejects empty research requests", async () => {
    const gateway = new GovernedRadarReachGateway([adapter]);
    await expect(gateway.discover({ query: "", sources: ["WEB"] })).rejects.toThrow("RADAR_QUERY_REQUIRED");
    await expect(gateway.discover({ query: "x", sources: [] })).rejects.toThrow("RADAR_SOURCE_REQUIRED");
  });
});
