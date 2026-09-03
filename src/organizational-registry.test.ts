import { describe, expect, it } from "vitest";
import { OrganizationalRegistry } from "./organizational-registry.js";

describe("OrganizationalRegistry", () => {
  it("resolves an active agent by responsibility and capability", () => {
    const registry = new OrganizationalRegistry();
    registry.registerOrganization({ entityId: "CO-001", type: "COMPANY", name: "Digital Company", status: "ACTIVE", version: 1 });
    registry.registerRole({ roleId: "ROLE-001", name: "Marketing", organizationId: "CO-001", responsibilities: ["RESP-001"], authorityProfileId: "AUTH-001", status: "ACTIVE" });
    registry.registerResponsibility({ responsibilityId: "RESP-001", name: "Campaign execution", ownerRoleId: "ROLE-001", scope: "COMPANY" });
    registry.registerCapability({ capabilityId: "CAP-001", name: "Content", requiredTools: [], riskLevel: "LOW" });
    registry.registerAgent({ agentId: "AGT-001", name: "Marketing Agent", roleId: "ROLE-001", organizationId: "CO-001", companyId: "CO-001", capabilityIds: ["CAP-001"], scope: "COMPANY", status: "ACTIVE" });

    const result = registry.resolve("RESP-001", ["CAP-001"]);
    expect(result.candidateAgents.map(agent => agent.agentId)).toEqual(["AGT-001"]);
  });

  it("rejects an agent with an unknown capability", () => {
    const registry = new OrganizationalRegistry();
    registry.registerOrganization({ entityId: "CO-001", type: "COMPANY", name: "Digital Company", status: "ACTIVE", version: 1 });
    registry.registerRole({ roleId: "ROLE-001", name: "Marketing", organizationId: "CO-001", responsibilities: [], authorityProfileId: "AUTH-001", status: "ACTIVE" });
    expect(() => registry.registerAgent({ agentId: "AGT-001", name: "Agent", roleId: "ROLE-001", organizationId: "CO-001", capabilityIds: ["MISSING"], scope: "COMPANY", status: "ACTIVE" })).toThrow("CAPABILITY_NOT_FOUND:MISSING");
  });
});
