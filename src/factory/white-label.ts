import { TenantConfig, validateTenantConfig } from "./agent-contract.js";

export interface ResolvedBranding {
  tenantId: string;
  brandName: string;
  agentName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  welcomeMessage?: string;
  domain?: string;
  plan: string;
  features: string[];
  permissions: string[];
}

export function resolveWhiteLabel(config: TenantConfig): ResolvedBranding {
  const blockers = validateTenantConfig(config);
  if (blockers.length > 0) {
    throw new Error(blockers.join("|"));
  }

  return {
    tenantId: config.tenantId,
    brandName: config.brandName,
    agentName: config.agentName,
    logoUrl: config.logoUrl,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    welcomeMessage: config.welcomeMessage,
    domain: config.domain,
    plan: config.plan,
    features: [...config.features],
    permissions: [...config.permissions],
  };
}
