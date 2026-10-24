import { describe, expect, it } from "vitest";
import { ProviderNeutralRouter } from "./provider-router.js";

describe("ProviderNeutralRouter", () => {
  it("prefers the requested provider when executable", () => {
    const router = new ProviderNeutralRouter();
    const result = router.select(
      { task: "reasoning", capabilities: ["reasoning"] },
      [
        { providerId: "openai", modelId: "m1", capabilities: ["reasoning"], executable: true, estimatedCost: 2 },
        { providerId: "google", modelId: "m2", capabilities: ["reasoning"], executable: true, estimatedCost: 1 },
      ],
      "openai",
    );
    expect(result.selected?.providerId).toBe("openai");
  });

  it("falls back deterministically", () => {
    const router = new ProviderNeutralRouter();
    const result = router.select(
      { task: "reasoning", capabilities: ["reasoning"] },
      [
        { providerId: "openai", modelId: "m1", capabilities: ["reasoning"], executable: false },
        { providerId: "google", modelId: "m2", capabilities: ["reasoning"], executable: true },
      ],
      "openai",
    );
    expect(result.selected?.providerId).toBe("google");
    expect(result.attempts).toEqual(["openai/m1", "google/m2"]);
  });

  it("fails closed when no provider is executable", () => {
    const router = new ProviderNeutralRouter();
    const result = router.select(
      { task: "reasoning", capabilities: ["reasoning"] },
      [
        { providerId: "openai", modelId: "m1", capabilities: ["reasoning"], executable: false },
      ],
    );
    expect(result.selected).toBeUndefined();
    expect(result.blockers).toContain("NO_EXECUTABLE_PROVIDER_MATCH");
  });
});
