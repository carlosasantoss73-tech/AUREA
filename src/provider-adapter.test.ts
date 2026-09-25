import { describe, expect, it } from "vitest";
import {
  verifyProviderAdapter,
  type ProviderAdapter,
} from "./provider-adapter.js";

describe("ProviderAdapter contract", () => {
  it("accepts executable evidence only from a healthy adapter probe", async () => {
    const adapter: ProviderAdapter = {
      providerId: "provider-test",
      modelId: "model-test",
      capabilities: ["text"],
      async healthCheck() {
        return {
          providerId: "provider-test",
          modelId: "model-test",
          status: "HEALTHY",
          checkedAt: "2026-09-25T00:00:00.000Z",
          evidence: ["healthcheck:pass"],
        };
      },
      async execute() {
        return {
          providerId: "provider-test",
          modelId: "model-test",
          executionId: "exec-test",
          output: "ok",
          evidence: ["execution:test"],
        };
      },
    };

    const health = await verifyProviderAdapter(adapter);

    expect(health.status).toBe("HEALTHY");
    expect(health.evidence).toContain("healthcheck:pass");
  });

  it("fails closed on health identity mismatch", async () => {
    const adapter: ProviderAdapter = {
      providerId: "provider-test",
      modelId: "model-test",
      capabilities: ["text"],
      async healthCheck() {
        return {
          providerId: "other-provider",
          modelId: "model-test",
          status: "HEALTHY",
          checkedAt: "2026-09-25T00:00:00.000Z",
          evidence: ["healthcheck:pass"],
        };
      },
      async execute() {
        throw new Error("NOT_USED");
      },
    };

    await expect(verifyProviderAdapter(adapter)).rejects.toThrow(
      "PROVIDER_HEALTH_IDENTITY_MISMATCH",
    );
  });
});
