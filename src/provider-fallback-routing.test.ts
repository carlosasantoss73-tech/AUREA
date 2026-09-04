import { describe, expect, it } from "vitest";
import { ProviderFallbackRouter } from "./provider-fallback-routing.js";
import { ProviderRuntime } from "./provider-runtime.js";

describe("ProviderFallbackRouter", () => {
  it("selects the preferred executable provider first", () => {
    const runtime = new ProviderRuntime();
    runtime.register({ providerId: "p1", modelId: "m1", status: "EXECUTABLE", capabilities: ["text"], healthEvidence: ["h1"] });
    runtime.register({ providerId: "p2", modelId: "m2", status: "EXECUTABLE", capabilities: ["text"], healthEvidence: ["h2"] });

    const result = new ProviderFallbackRouter(runtime).select({
      requiredCapability: "text",
      preferredProviderId: "p2",
      orderedProviderIds: ["p1", "p2"],
    });

    expect(result.status).toBe("SELECTED");
    expect(result.provider?.providerId).toBe("p2");
    expect(result.attempts).toEqual(["p2"]);
  });

  it("falls back deterministically when the preferred provider is not executable", () => {
    const runtime = new ProviderRuntime();
    runtime.register({ providerId: "p1", modelId: "m1", status: "BLOCKED", capabilities: ["text"], healthEvidence: ["blocked"] });
    runtime.register({ providerId: "p2", modelId: "m2", status: "EXECUTABLE", capabilities: ["text"], healthEvidence: ["healthy"] });

    const result = new ProviderFallbackRouter(runtime).select({
      requiredCapability: "text",
      preferredProviderId: "p1",
      orderedProviderIds: ["p1", "p2"],
    });

    expect(result.status).toBe("SELECTED");
    expect(result.provider?.providerId).toBe("p2");
    expect(result.attempts).toEqual(["p1", "p2"]);
  });

  it("fails closed when no ordered provider is executable", () => {
    const runtime = new ProviderRuntime();
    runtime.register({ providerId: "p1", modelId: "m1", status: "BLOCKED", capabilities: ["text"], healthEvidence: [] });
    runtime.register({ providerId: "p2", modelId: "m2", status: "AVAILABLE", capabilities: ["text"], healthEvidence: [] });

    const result = new ProviderFallbackRouter(runtime).select({ requiredCapability: "text", orderedProviderIds: ["p1", "p2"] });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("NO_EXECUTABLE_PROVIDER_AFTER_FALLBACK");
  });
});
