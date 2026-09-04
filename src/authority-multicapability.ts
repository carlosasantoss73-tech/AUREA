import { evaluatePermission, PermissionDecision, EffectClass } from "./security/permission-gateway.js";
import { OrganizationalRegistry, ScopeType } from "./organizational-registry.js";

export interface AuthorityProfile {
  authorityProfileId: string;
  roleId: string;
  allowedScopes: ScopeType[];
  allowedCapabilityIds: string[];
}

export interface AuthorityResolutionRequest {
  traceId: string;
  actorId: string;
  actorRole: string;
  responsibilityId: string;
  projectId: string;
  requiredCapabilityIds: string[];
  effectClass: EffectClass;
  action: string;
  allowedProjects?: string[];
  allowedCapabilities?: string[];
  allowedTools?: string[];
  approvedByHuman?: boolean;
  maxCalls?: number;
  callsUsed?: number;
}

export interface CapabilityAuthorization {
  capabilityId: string;
  toolId: string;
  decision: PermissionDecision;
  reason: string;
  traceId: string;
}

export interface AuthorityResolution {
  status: "AUTHORIZED" | "BLOCKED";
  actorId: string;
  authorityProfileId?: string;
  candidateAgentIds: string[];
  authorizations: CapabilityAuthorization[];
  blockers: string[];
  evidence: string[];
}

/**
 * Resolves authority for the complete capability set. Capability possession is
 * not authority by itself: role/profile, organizational scope and every required
 * capability/tool permission must agree before authorization is returned.
 */
export class AuthorityMultiCapabilityResolver {
  private readonly profiles = new Map<string, AuthorityProfile>();

  constructor(private readonly organization: OrganizationalRegistry) {}

  registerProfile(profile: AuthorityProfile): void {
    if (this.profiles.has(profile.authorityProfileId)) {
      throw new Error(`AUTHORITY_PROFILE_ALREADY_REGISTERED:${profile.authorityProfileId}`);
    }
    this.profiles.set(profile.authorityProfileId, { ...profile, allowedScopes: [...profile.allowedScopes], allowedCapabilityIds: [...profile.allowedCapabilityIds] });
  }

  resolve(request: AuthorityResolutionRequest): AuthorityResolution {
    const resolution = this.organization.resolve(request.responsibilityId, request.requiredCapabilityIds);
    const candidates = resolution.candidateAgents.filter(agent => agent.agentId === request.actorId);
    const blockers: string[] = [];
    const authorizations: CapabilityAuthorization[] = [];
    const evidence = [`TRACE:${request.traceId}`, `ACTOR:${request.actorId}`];

    if (candidates.length === 0) blockers.push("ACTOR_NOT_AUTHORIZED_FOR_RESPONSIBILITY");

    const actor = candidates[0];
    const role = actor ? this.organization.getRole(actor.roleId) : undefined;
    const profile = role ? this.profiles.get(role.authorityProfileId) : undefined;
    if (actor && !role) blockers.push("REGISTERED_ROLE_NOT_FOUND");
    if (actor && role && request.actorRole !== role.name) blockers.push("ACTOR_ROLE_IDENTITY_MISMATCH");
    if (actor && !profile) blockers.push("AUTHORITY_PROFILE_NOT_REGISTERED");
    if (actor && profile && profile.roleId !== actor.roleId) blockers.push("AUTHORITY_ROLE_MISMATCH");
    if (actor && profile && !profile.allowedScopes.includes(resolution.scope)) blockers.push("AUTHORITY_SCOPE_DENIED");

    for (const capability of resolution.requiredCapabilities) {
      if (!profile?.allowedCapabilityIds.includes(capability.capabilityId)) {
        blockers.push(`CAPABILITY_NOT_AUTHORIZED:${capability.capabilityId}`);
        continue;
      }

      const tools = capability.requiredTools.length > 0 ? capability.requiredTools : [];
      if (tools.length === 0) {
        blockers.push(`CAPABILITY_TOOLS_UNDEFINED:${capability.capabilityId}`);
        continue;
      }

      for (const toolId of tools) {
        const permission = evaluatePermission({
          actorId: request.actorId,
          actorRole: request.actorRole,
          projectId: request.projectId,
          capabilityId: capability.capabilityId,
          toolId,
          action: request.action,
          effectClass: request.effectClass,
          approvedByHuman: request.approvedByHuman,
          allowedProjects: request.allowedProjects,
          allowedCapabilities: request.allowedCapabilities,
          allowedTools: request.allowedTools,
          maxCalls: request.maxCalls,
          callsUsed: request.callsUsed,
        }, request.traceId);

        authorizations.push({ capabilityId: capability.capabilityId, toolId, ...permission });
        evidence.push(`PERMISSION:${capability.capabilityId}:${toolId}:${permission.decision}`);
        if (!["ALLOW", "ALLOW_WITH_LIMITS"].includes(permission.decision)) {
          blockers.push(`${permission.decision}:${capability.capabilityId}:${toolId}:${permission.reason}`);
        }
      }
    }

    if (blockers.length > 0) {
      return {
        status: "BLOCKED",
        actorId: request.actorId,
        authorityProfileId: profile?.authorityProfileId,
        candidateAgentIds: resolution.candidateAgents.map(agent => agent.agentId),
        authorizations,
        blockers: [...new Set(blockers)],
        evidence,
      };
    }

    return {
      status: "AUTHORIZED",
      actorId: request.actorId,
      authorityProfileId: profile?.authorityProfileId,
      candidateAgentIds: resolution.candidateAgents.map(agent => agent.agentId),
      authorizations,
      blockers: [],
      evidence,
    };
  }
}
