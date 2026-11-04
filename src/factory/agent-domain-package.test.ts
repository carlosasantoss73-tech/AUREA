import { describe, expect, it } from "vitest";
import { validateAgentDomainPackage, type AgentDomainPackage } from "./agent-domain-package.js";
import type { AgentManifest } from "./agent-contract.js";

const manifest: AgentManifest = {
  agentId: "example-agent",
  version: "1.0.0",
  name: "Example Agent",
  mission: "Test",
  scope: ["test"],
  limitations: ["no invention"],
  inputs: ["input"],
  outputs: ["output"],
  knowledge: ["knowledge"],
  rules: ["rule"],
  skills: ["skill"],
  tools: ["tool"],
  workflows: ["workflow"],
  deterministicTasks: ["task"],
  validators: ["validator"],
  testSuite: ["suite"],
  supportedAdapters: ["provider-neutral"],
  permissions: ["read"],
  metrics: ["metric"],
  limits: { maxDocumentsPerRun: 1, maxRequirementsPerRun: 1 },
  lifecycle: "DEVELOPMENT",
};

const domain: AgentDomainPackage = {
  agentId: "example-agent",
  version: "1.0.0",
  domainRules: ["rule"],
  workflows: ["workflow"],
  validators: ["validator"],
  deterministicTasks: ["task"],
  knowledgeSources: ["source"],
  testSuite: ["suite"],
};

describe("AgentDomainPackage", () => {
  it("accepts a complete domain package aligned with the manifest", () => {
    expect(validateAgentDomainPackage(manifest, domain)).toEqual({
      status: "READY",
      blockers: [],
    });
  });

  it("blocks an incomplete package instead of silently accepting it", () => {
    expect(
      validateAgentDomainPackage(manifest, {
        ...domain,
        agentId: "other-agent",
        domainRules: [],
        workflows: [],
        validators: [],
        knowledgeSources: [],
        testSuite: [],
      }),
    ).toEqual({
      status: "BLOCKED",
      blockers: [
        "DOMAIN_AGENT_ID_MISMATCH",
        "DOMAIN_RULES_REQUIRED",
        "DOMAIN_WORKFLOWS_REQUIRED",
        "DOMAIN_VALIDATORS_REQUIRED",
        "DOMAIN_KNOWLEDGE_SOURCES_REQUIRED",
        "DOMAIN_TEST_SUITE_REQUIRED",
      ],
    });
  });
});
