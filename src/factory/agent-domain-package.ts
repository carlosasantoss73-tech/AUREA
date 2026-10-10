import type { AgentManifest } from "./agent-contract.js";

export interface AgentDomainPackage {
  agentId: string;
  version: string;
  domainRules: readonly string[];
  workflows: readonly string[];
  validators: readonly string[];
  deterministicTasks: readonly string[];
  knowledgeSources: readonly string[];
  testSuite: readonly string[];
}

export interface DomainPackageReadiness {
  status: "READY" | "BLOCKED";
  blockers: string[];
}

export function validateAgentDomainPackage(
  manifest: AgentManifest,
  domain: AgentDomainPackage,
): DomainPackageReadiness {
  const blockers: string[] = [];

  if (domain.agentId !== manifest.agentId) {
    blockers.push("DOMAIN_AGENT_ID_MISMATCH");
  }

  if (domain.version !== manifest.version) {
    blockers.push("DOMAIN_VERSION_MISMATCH");
  }

  if (domain.domainRules.length === 0) {
    blockers.push("DOMAIN_RULES_REQUIRED");
  }

  if (domain.workflows.length === 0) {
    blockers.push("DOMAIN_WORKFLOWS_REQUIRED");
  }

  if (domain.validators.length === 0) {
    blockers.push("DOMAIN_VALIDATORS_REQUIRED");
  }

  if (domain.knowledgeSources.length === 0) {
    blockers.push("DOMAIN_KNOWLEDGE_SOURCES_REQUIRED");
  }

  if (domain.testSuite.length === 0) {
    blockers.push("DOMAIN_TEST_SUITE_REQUIRED");
  }

  return {
    status: blockers.length === 0 ? "READY" : "BLOCKED",
    blockers,
  };
}
