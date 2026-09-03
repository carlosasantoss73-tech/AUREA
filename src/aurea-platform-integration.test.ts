import { describe, expect, it } from "vitest";
import { AureaPlatformIntegration, PlatformAdapter } from "./aurea-platform-integration.js";

const adapter: PlatformAdapter = {
  manifest: {
    integrationId: "INT-001",
    componentId: "aurea-core",
    version: "0.1.0",
    boundaries: ["ORCHESTRATOR", "PLANNER", "WORK_CELL", "SENTINEL"],
    requiredCapabilities: ["orchestrate", "plan", "observe"],
    requiredConfiguration: ["runtime"],
    healthChecks: ["connected", "available", "executable", "healthy"],
    rollbackPlan: "Disable integration and restore previous runtime configuration.",
  },
  inspect: () => ({
    integrationId: "INT-001",
    status: "HEALTHY",
    checkedAt: "2026-09-03T00:00:00.000Z",
    checks: { configured: true, connected: true, available: true, executable: true, healthy: true },
    evidence: ["E-001"],
    blockers: [],
  }),
};

describe("AUREA platform integration", () => {
  it("does not confuse registration with runtime health", () => {
    const integration = new AureaPlatformIntegration();
    integration.register(adapter);

    expect(integration.readiness("INT-001")).toBe("HEALTHY");
    expect(integration.list()).toHaveLength(1);
  });

  it("blocks readiness when inspection reports blockers", () => {
    const integration = new AureaPlatformIntegration();
    integration.register({
      ...adapter,
      manifest: { ...adapter.manifest, integrationId: "INT-002" },
      inspect: () => ({ ...adapter.inspect(), integrationId: "INT-002", status: "BLOCKED", blockers: ["runtime unavailable"] }),
    });

    expect(integration.readiness("INT-002")).toBe("BLOCKED");
  });
});
