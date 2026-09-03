import { describe, expect, it } from "vitest";
import { ProviderRuntime } from "./provider-runtime";

describe("ProviderRuntime", () => {
  it("selects only executable providers", () => {
    const runtime = new ProviderRuntime();
    runtime.register({
      providerId: "p-registered",
      modelId: "m1",
      status: "REGISTERED",
      capabilities: ["text"],
      healthEvidence: [],
    });
    runtime.register({
      providerId: "p-live",
      modelId: "m2",
      status: "EXECUTABLE",
      capabilities: ["text"],
      healthEvidence: ["healthcheck:pass"],
    });

    const result = runtime.select({ requiredCapability: "text" });
    expect(result.status).toBe("SELECTED");
    expect(result.provider?.providerId).toBe("p-live");
  });

  it("fails closed when no executable provider exists", () => {
    const runtime = new ProviderRuntime();
    runtime.register({
      providerId: "p-blocked",
      modelId: "m1",
      status: "BLOCKED",
      capabilities: ["text"],
      healthEvidence: ["healthcheck:fail"],
    });

    const result = runtime.select({ requiredCapability: "text" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("NO_EXECUTABLE_PROVIDER_FOR_CAPABILITY");
  });
});
