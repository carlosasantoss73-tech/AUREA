export type AgentLifecycleState =
  | "DRAFT"
  | "DEVELOPMENT"
  | "TESTING"
  | "VALIDATED"
  | "STAGED"
  | "PRODUCTION"
  | "DEPRECATED"
  | "RETIRED";

export type EvidenceKind =
  | "SOURCE"
  | "RULE"
  | "CALCULATION"
  | "VALIDATION"
  | "RESULT"
  | "DECISION";

export interface AgentManifest {
  agentId: string;
  version: string;
  name: string;
  mission: string;
  scope: string[];
  limitations: string[];
  inputs: string[];
  outputs: string[];
  knowledge: string[];
  rules: string[];
  skills: string[];
  tools: string[];
  workflows: string[];
  deterministicTasks: string[];
  validators: string[];
  testSuite: string[];
  supportedAdapters: string[];
  permissions: string[];
  metrics: string[];
  limits: Record<string, number | string>;
  lifecycle: AgentLifecycleState;
}

export interface TenantConfig {
  tenantId: string;
  brandName: string;
  agentName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  welcomeMessage?: string;
  domain?: string;
  features: string[];
  permissions: string[];
  plan: string;
  usageLimits: Record<string, number>;
}

export function validateAgentManifest(manifest: AgentManifest): string[] {
  const blockers: string[] = [];
  const required = [
    "agentId", "version", "name", "mission", "scope", "limitations",
    "inputs", "outputs", "knowledge", "rules", "skills", "tools",
    "workflows", "deterministicTasks", "validators", "testSuite",
    "supportedAdapters", "permissions", "metrics", "lifecycle",
  ] as const;

  for (const key of required) {
    const value = manifest[key];
    if (value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0)) {
      blockers.push(`MANIFEST_MISSING:${key}`);
    }
  }
  if (!/^\\d+\\.\\d+\\.\\d+$/.test(manifest.version)) {
    blockers.push("MANIFEST_INVALID_VERSION");
  }
  return blockers;
}

export function validateTenantConfig(config: TenantConfig): string[] {
  const blockers: string[] = [];
  if (!config.tenantId) blockers.push("TENANT_MISSING_ID");
  if (!config.brandName) blockers.push("TENANT_MISSING_BRAND");
  if (!config.agentName) blockers.push("TENANT_MISSING_AGENT_NAME");
  if (!config.plan) blockers.push("TENANT_MISSING_PLAN");
  return blockers;
}
