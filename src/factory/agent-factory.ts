import {
  AgentManifest,
  TenantConfig,
  validateAgentManifest,
  validateTenantConfig,
} from "./agent-contract.js";
import { EvidenceLedger } from "./evidence.js";
import { resolveWhiteLabel } from "./white-label.js";

export interface AgentPackage {
  manifest: AgentManifest;
  tenant: TenantConfig;
}

export interface FactoryReadiness {
  status: "READY" | "BLOCKED";
  blockers: string[];
  evidence: string[];
}

export class AureaAgentFactory {
  constructor(readonly evidence = new EvidenceLedger()) {}

  validatePackage(pkg: AgentPackage, executionId = "factory-validation"): FactoryReadiness {
    const blockers = [
      ...validateAgentManifest(pkg.manifest),
      ...validateTenantConfig(pkg.tenant),
    ];

    if (blockers.length === 0) {
      resolveWhiteLabel(pkg.tenant);
      this.evidence.add({
        id: `${executionId}:manifest`,
        executionId,
        kind: "VALIDATION",
        value: "PASS",
        timestamp: new Date().toISOString(),
      });
      return {
        status: "READY",
        blockers: [],
        evidence: [`MANIFEST:${pkg.manifest.agentId}`, `TENANT:${pkg.tenant.tenantId}`],
      };
    }

    return {
      status: "BLOCKED",
      blockers,
      evidence: [],
    };
  }
}
