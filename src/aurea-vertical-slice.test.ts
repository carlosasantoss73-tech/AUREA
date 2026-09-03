import { describe, expect, it } from "vitest";
import { AureaOrchestrator } from "./aurea-orchestrator.js";
import {
  AgentDefinition,
  OrganizationalRegistry,
  ResponsibilityDefinition,
  RoleDefinition,
} from "./organizational-registry.js";
import { HealthLedger } from "./health-ledger.js";
import { AureaSentinel } from "./sentinel.js";
import { AureaVerticalSlice, VerticalSliceRequest } from "./aurea-vertical-slice.js";

function buildSlice() {
  const organization = new OrganizationalRegistry();
  organization.registerOrganization({ entityId: "CO-001", type: "COMPANY", name: "Company", status: "ACTIVE", version: 1 });
  const role: RoleDefinition = {
    roleId: "ROLE-001", name: "Operator", organizationId: "CO-001", responsibilities: ["RESP-001"],
    authorityProfileId: "AUTH-001", status: "ACTIVE",
  };
  organization.registerRole(role);
  const responsibility: ResponsibilityDefinition = {
    responsibilityId: "RESP-001", name: "Operate", ownerRoleId: role.roleId, scope: "COMPANY",
  };
  organization.registerResponsibility(responsibility);
  organization.registerCapability({ capabilityId: "CAP-001", name: "Operate", requiredTools: ["TOOL-001"], riskLevel: "LOW" });
  const agent: AgentDefinition = {
    agentId: "AGT-001", name: "Operator Agent", roleId: role.roleId, organizationId: "CO-001",
    companyId: "CO-001", capabilityIds: ["CAP-001"], scope: "COMPANY", status: "ACTIVE",
  };
  organization.registerAgent(agent);

  const ledger = new HealthLedger();
  const sentinel = new AureaSentinel(ledger);
  return { slice: new AureaVerticalSlice(organization, new AureaOrchestrator(), sentinel), ledger };
}

const request: VerticalSliceRequest = {
  traceId: "TRACE-001", projectId: "PRJ-001", objective: "Prepare operation",
  responsibilityId: "RESP-001", requiredCapabilityIds: ["CAP-001"], actorId: "AGT-001", actorRole: "ROLE-001",
  toolId: "TOOL-001", action: "operate", effectClass: "READ", allowedProjects: ["PRJ-001"],
  allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
  tasks: [{ id: "T1", name: "Prepare", stage: "PREFLIGHT", dependsOn: [], agent: "AGT-001", status: "PENDING" }],
};

describe("AUREA vertical slice", () => {
  it("connects organization, permission, orchestration and returns READY", () => {
    const { slice, ledger } = buildSlice();
    const result = slice.prepare(request);

    expect(result.status).toBe("READY");
    expect(result.resolution?.candidateAgents[0]?.agentId).toBe("AGT-001");
    expect(result.permission?.decision).toBe("ALLOW");
    expect(result.plan?.tasks[0]?.status).toBe("READY");
    expect(ledger.unresolved()).toHaveLength(0);
  });

  it("blocks unauthorized execution and records the incident", () => {
    const { slice, ledger } = buildSlice();
    const result = slice.prepare({ ...request, allowedTools: ["OTHER-TOOL"] });

    expect(result.status).toBe("BLOCKED");
    expect(result.permission?.decision).toBe("DENY");
    expect(result.blockers).toContain("TOOL_NOT_REGISTERED_OR_ALLOWED");
    expect(ledger.unresolved()).toHaveLength(1);
  });
});
