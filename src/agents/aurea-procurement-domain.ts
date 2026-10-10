import { AUREA_PROCUREMENT_MANIFEST } from "./aurea-procurement.js";
import {
  validateAgentDomainPackage,
  type AgentDomainPackage,
} from "../factory/agent-domain-package.js";

export const AUREA_PROCUREMENT_DOMAIN_PACKAGE: AgentDomainPackage = {
  agentId: AUREA_PROCUREMENT_MANIFEST.agentId,
  version: AUREA_PROCUREMENT_MANIFEST.version,
  domainRules: AUREA_PROCUREMENT_MANIFEST.rules,
  workflows: AUREA_PROCUREMENT_MANIFEST.workflows,
  validators: AUREA_PROCUREMENT_MANIFEST.validators,
  deterministicTasks: AUREA_PROCUREMENT_MANIFEST.deterministicTasks,
  knowledgeSources: AUREA_PROCUREMENT_MANIFEST.knowledge,
  testSuite: AUREA_PROCUREMENT_MANIFEST.testSuite,
};

export const AUREA_PROCUREMENT_DOMAIN_READINESS =
  validateAgentDomainPackage(
    AUREA_PROCUREMENT_MANIFEST,
    AUREA_PROCUREMENT_DOMAIN_PACKAGE,
  );
