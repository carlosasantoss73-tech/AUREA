/**
 * AUREA Organizational Registry — P0 vertical slice
 *
 * Source of truth for organizational identity, responsibility, capability and scope.
 * Authorization remains delegated to the existing Permission Gateway.
 */

export type OrganizationType = "HOLDING" | "COMPANY" | "DIRECTORATE" | "DEPARTMENT";
export type EntityStatus = "PROPOSED" | "ACTIVE" | "SUSPENDED" | "DEPRECATED" | "RETIRED";
export type ScopeType = "HOLDING" | "COMPANY" | "DIRECTORATE" | "DEPARTMENT" | "PROJECT" | "WORK_CELL" | "RESOURCE";

export interface OrganizationEntity {
  entityId: string;
  type: OrganizationType;
  name: string;
  parentId?: string;
  status: EntityStatus;
  version: number;
}

export interface RoleDefinition {
  roleId: string;
  name: string;
  organizationId: string;
  responsibilities: string[];
  authorityProfileId: string;
  status: EntityStatus;
}

export interface AgentDefinition {
  agentId: string;
  name: string;
  roleId: string;
  organizationId: string;
  companyId?: string;
  departmentId?: string;
  capabilityIds: string[];
  scope: ScopeType;
  escalationTargetId?: string;
  status: EntityStatus;
}

export interface ResponsibilityDefinition {
  responsibilityId: string;
  name: string;
  ownerRoleId: string;
  scope: ScopeType;
  description?: string;
}

export interface CapabilityDefinition {
  capabilityId: string;
  name: string;
  requiredTools: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface OrganizationalResolution {
  responsibility?: ResponsibilityDefinition;
  candidateAgents: AgentDefinition[];
  requiredCapabilities: CapabilityDefinition[];
  scope: ScopeType;
  escalationTargetId?: string;
}

export class OrganizationalRegistry {
  private organizations = new Map<string, OrganizationEntity>();
  private roles = new Map<string, RoleDefinition>();
  private agents = new Map<string, AgentDefinition>();
  private responsibilities = new Map<string, ResponsibilityDefinition>();
  private capabilities = new Map<string, CapabilityDefinition>();

  registerOrganization(entity: OrganizationEntity): void {
    if (this.organizations.has(entity.entityId)) throw new Error("ORGANIZATION_ALREADY_REGISTERED");
    this.organizations.set(entity.entityId, entity);
  }

  registerRole(role: RoleDefinition): void {
    if (this.roles.has(role.roleId)) throw new Error("ROLE_ALREADY_REGISTERED");
    if (!this.organizations.has(role.organizationId)) throw new Error("ORGANIZATION_NOT_FOUND");
    this.roles.set(role.roleId, role);
  }

  registerResponsibility(responsibility: ResponsibilityDefinition): void {
    if (this.responsibilities.has(responsibility.responsibilityId)) throw new Error("RESPONSIBILITY_ALREADY_REGISTERED");
    if (!this.roles.has(responsibility.ownerRoleId)) throw new Error("ROLE_NOT_FOUND");
    this.responsibilities.set(responsibility.responsibilityId, responsibility);
  }

  registerCapability(capability: CapabilityDefinition): void {
    if (this.capabilities.has(capability.capabilityId)) throw new Error("CAPABILITY_ALREADY_REGISTERED");
    this.capabilities.set(capability.capabilityId, capability);
  }

  registerAgent(agent: AgentDefinition): void {
    if (this.agents.has(agent.agentId)) throw new Error("AGENT_ALREADY_REGISTERED");
    if (!this.roles.has(agent.roleId)) throw new Error("ROLE_NOT_FOUND");
    if (!this.organizations.has(agent.organizationId)) throw new Error("ORGANIZATION_NOT_FOUND");
    for (const capabilityId of agent.capabilityIds) {
      if (!this.capabilities.has(capabilityId)) throw new Error(`CAPABILITY_NOT_FOUND:${capabilityId}`);
    }
    this.agents.set(agent.agentId, agent);
  }

  resolve(responsibilityId: string, requiredCapabilityIds: string[] = []): OrganizationalResolution {
    const responsibility = this.responsibilities.get(responsibilityId);
    if (!responsibility) throw new Error("RESPONSIBILITY_NOT_FOUND");

    const requiredCapabilities = requiredCapabilityIds.map(id => {
      const capability = this.capabilities.get(id);
      if (!capability) throw new Error(`CAPABILITY_NOT_FOUND:${id}`);
      return capability;
    });

    const candidates = [...this.agents.values()].filter(agent =>
      agent.status === "ACTIVE" &&
      agent.roleId === responsibility.ownerRoleId &&
      agent.scope === responsibility.scope &&
      requiredCapabilityIds.every(id => agent.capabilityIds.includes(id)),
    );

    return {
      responsibility,
      candidateAgents: candidates,
      requiredCapabilities,
      scope: responsibility.scope,
      escalationTargetId: candidates[0]?.escalationTargetId,
    };
  }

  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }
}
