import { describe, expect, it } from "vitest";
import { resolveWhiteLabel } from "./white-label.js";

describe("White Label", () => {
  it("isolates client identity from agent logic", () => {
    const result = resolveWhiteLabel({
      tenantId: "client-a",
      brandName: "Cliente A",
      agentName: "Encuestas",
      features: ["survey-processing"],
      permissions: ["survey:read"],
      plan: "business",
      usageLimits: { recordsPerRun: 100 },
    });
    expect(result.tenantId).toBe("client-a");
    expect(result.brandName).toBe("Cliente A");
    expect(result.agentName).toBe("Encuestas");
  });
});
