import { describe, expect, it } from "vitest";
import { assertIntegrationUsable, AureaIntegration, IntegrationContext } from "./aurea-integration-contracts";

const context: IntegrationContext = {
  projectId: "p0",
  actorId: "actor-1",
  actorRole: "operator",
  allowedCapabilities: ["media.video"],
  allowedTools: [],
};

const integration: AureaIntegration = {
  id: "provider.video.example",
  kind: "PROVIDER",
  version: 1,
  status: "VERIFIED",
  capabilities: ["media.video"],
  async execute() {
    return { status: "SUCCEEDED", integrationId: "provider.video.example", operation: "generate" };
  },
};

describe("AUREA integration contracts", () => {
  it("requires a verified integration and an allowed capability", () => {
    expect(() => assertIntegrationUsable(integration, context)).not.toThrow();
    expect(() => assertIntegrationUsable({ ...integration, status: "CONFIGURED" }, context)).toThrow("INTEGRATION_NOT_VERIFIED");
    expect(() => assertIntegrationUsable(integration, { ...context, allowedCapabilities: [] })).toThrow("INTEGRATION_CAPABILITY_NOT_ALLOWED");
  });
});
