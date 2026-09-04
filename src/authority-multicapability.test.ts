import { describe, expect, it } from "vitest";
import { AuthorityMultiCapabilityResolver } from "./authority-multicapability.js";
import { OrganizationalRegistry } from "./organizational-registry.js";

function buildRegistry(): OrganizationalRegistry {
  const registry = new OrganizationalRegistry();
  registry.registerOrganization({ entityId: "holding", type: "HOLDING", name: "Holding", status: "ACTIVE", version: 1 });
  registry.registerRole({ roleId: "role-ops", name: "Operations", organizationId: "holding", responsibilities: ["resp-run"], authorityProfileId: "authority-ops", status: "ACTIVE" });
  registry.registerResponsibility({ responsibilityId: "resp-run", name: "Run controlled operation", ownerRoleId: "role-ops", scope: "HOLDING" });
  registry.registerCapability({ capabilityId: "cap-a", name: "Capability A", requiredTools: ["tool-a"], riskLevel: "LOW" });
  registry.registerCapability({ capabilityId: "cap-b", name: "Capability B", requiredTools: ["tool-b"], riskLevel: "MEDIUM" });
  registry.registerAgent({ agentId: "agent-ops", name: "Ops Agent", roleId: "role-ops", organizationId: "holding", capabilityIds: ["cap-a", "cap-b"], scope: "HOLDING", status: "ACTIVE" });
  return registry;
}

describe("AuthorityMultiCapabilityResolver", () => {
  it("authorizes only when every required capability and tool is allowed", () => {
    const resolver = new AuthorityMultiCapabilityResolver(buildRegistry());
    resolver.registerProfile({ authorityProfileId: "authority-ops", roleId: "role-ops", allowedScopes: ["HOLDING"], allowedCapabilityIds: ["cap-a", "cap-b"] });

    const result = resolver.resolve({
      traceId: "trace-auth-1",
      actorId: "agent-ops",
      actorRole: "Operations",
      responsibilityId: "resp-run",
      projectId: "p-1",
      requiredCapabilityIds: ["cap-a", "cap-b"],
      effectClass: "READ",
      action: "inspect",
      allowedProjects: ["p-1"],
      allowedCapabilities: ["cap-a", "cap-b"],
      allowedTools: ["tool-a", "tool-b"],
    });

    expect(result.status).toBe("AUTHORIZED");
    expect(result.authorizations).toHaveLength(2);
    expect(result.blockers).toEqual([]);
  });

  it("fails closed when one required capability is not in the authority profile", () => {
    const resolver = new AuthorityMultiCapabilityResolver(buildRegistry());
    resolver.registerProfile({ authorityProfileId: "authority-ops", roleId: "role-ops", allowedScopes: ["HOLDING"], allowedCapabilityIds: ["cap-a"] });

    const result = resolver.resolve({
      traceId: "trace-auth-2",
      actorId: "agent-ops",
      actorRole: "Operations",
      responsibilityId: "resp-run",
      projectId: "p-1",
      requiredCapabilityIds: ["cap-a", "cap-b"],
      effectClass: "READ",
      action: "inspect",
      allowedProjects: ["p-1"],
      allowedCapabilities: ["cap-a", "cap-b"],
      allowedTools: ["tool-a", "tool-b"],
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("CAPABILITY_NOT_AUTHORIZED:cap-b");
  });

  it("fails closed when one tool is outside the execution allowlist", () => {
    const resolver = new AuthorityMultiCapabilityResolver(buildRegistry());
    resolver.registerProfile({ authorityProfileId: "authority-ops", roleId: "role-ops", allowedScopes: ["HOLDING"], allowedCapabilityIds: ["cap-a", "cap-b"] });

    const result = resolver.resolve({
      traceId: "trace-auth-3",
      actorId: "agent-ops",
      actorRole: "Operations",
      responsibilityId: "resp-run",
      projectId: "p-1",
      requiredCapabilityIds: ["cap-a", "cap-b"],
      effectClass: "READ",
      action: "inspect",
      allowedProjects: ["p-1"],
      allowedCapabilities: ["cap-a", "cap-b"],
      allowedTools: ["tool-a"],
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.some(blocker => blocker.includes("tool-b"))).toBe(true);
  });
});
