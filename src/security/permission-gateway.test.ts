import { describe, expect, it } from "vitest";
import { evaluatePermission } from "./permission-gateway";

describe("AUREA Permission Gateway P0", () => {
  const base = {
    actorId: "agent-1",
    actorRole: "agent",
    projectId: "project-1",
    capabilityId: "knowledge.read",
    toolId: "knowledge.search",
    action: "read",
    effectClass: "READ" as const,
  };

  it("allows an explicitly scoped read", () => {
    expect(evaluatePermission({ ...base, allowedProjects: ["project-1"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"] }).decision).toBe("ALLOW");
  });

  it("denies a project scope violation", () => {
    expect(evaluatePermission({ ...base, allowedProjects: ["other-project"] }).decision).toBe("DENY");
  });

  it("requires approval for destructive actions", () => {
    expect(evaluatePermission({ ...base, effectClass: "DESTRUCTIVE" }).decision).toBe("REQUIRE_APPROVAL");
  });

  it("denies an exhausted usage limit", () => {
    expect(evaluatePermission({ ...base, maxCalls: 5, callsUsed: 5 }).decision).toBe("DENY");
  });
});
