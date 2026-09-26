import { describe, expect, it } from "vitest";
import { AureaCapabilityRegistry, CapabilityDefinition } from "./aurea-capability-registry";

const skill: CapabilityDefinition = {
  id: "marketing.video",
  kind: "SKILL",
  name: "Marketing Video",
  version: 1,
  status: "DRAFT",
  description: "Builds a governed marketing-video plan.",
  tags: ["marketing", "video"],
};

describe("AureaCapabilityRegistry", () => {
  it("registers and filters reusable capabilities", () => {
    const registry = new AureaCapabilityRegistry();
    registry.register(skill);
    registry.register({
      id: "provider.video",
      kind: "PROVIDER",
      name: "Video Provider",
      version: 1,
      status: "ACTIVE",
      description: "Provider-neutral video capability metadata.",
    });

    expect(registry.get("marketing.video")?.version).toBe(1);
    expect(registry.list("SKILL", "DRAFT")).toHaveLength(1);
    expect(registry.list("PROVIDER", "ACTIVE")).toHaveLength(1);
  });

  it("enforces the governed lifecycle", () => {
    const registry = new AureaCapabilityRegistry();
    registry.register(skill);

    expect(() => registry.transition("marketing.video", "ACTIVE")).toThrow("CAPABILITY_INVALID_TRANSITION");
    registry.transition("marketing.video", "HUMAN_REVIEW");
    registry.transition("marketing.video", "ACTIVE");
    registry.transition("marketing.video", "RETIRED");
    expect(registry.get("marketing.video")?.status).toBe("RETIRED");
  });

  it("versions only non-active capabilities", () => {
    const registry = new AureaCapabilityRegistry();
    registry.register(skill);
    const v2 = registry.version("marketing.video", {
      kind: "SKILL",
      name: "Marketing Video v2",
      description: "Improved governed marketing-video plan.",
      tags: ["marketing", "video", "v2"],
    });

    expect(v2.version).toBe(2);
    expect(v2.status).toBe("DRAFT");
    registry.transition("marketing.video", "HUMAN_REVIEW");
    registry.transition("marketing.video", "ACTIVE");
    expect(() => registry.version("marketing.video", skill)).toThrow("CAPABILITY_ACTIVE_VERSION_IMMUTABLE");
  });
});
