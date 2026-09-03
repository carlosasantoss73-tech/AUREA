export type IntegrationStatus =
  | "DESIGNED"
  | "REGISTERED"
  | "CONFIGURED"
  | "CONNECTED"
  | "AVAILABLE"
  | "EXECUTABLE"
  | "HEALTHY"
  | "BLOCKED"
  | "DEPRECATED";

export type IntegrationBoundary =
  | "ORCHESTRATOR"
  | "PLANNER"
  | "WORK_CELL"
  | "KNOWLEDGE"
  | "PERMISSION"
  | "EXECUTION"
  | "SENTINEL"
  | "QA"
  | "AUDIT"
  | "OPERATIONS";

export interface PlatformIntegrationManifest {
  integrationId: string;
  componentId: string;
  version: string;
  boundaries: IntegrationBoundary[];
  requiredCapabilities: string[];
  requiredConfiguration: string[];
  healthChecks: string[];
  rollbackPlan: string;
}

export interface IntegrationEvidence {
  integrationId: string;
  status: IntegrationStatus;
  checkedAt: string;
  checks: Record<string, boolean>;
  evidence: string[];
  blockers: string[];
}

export interface PlatformAdapter {
  manifest: PlatformIntegrationManifest;
  inspect(): IntegrationEvidence;
}

/**
 * The platform is the runtime home of AUREA.
 * This contract keeps incorporation explicit and verifiable instead of
 * treating source code presence as proof of platform integration.
 */
export class AureaPlatformIntegration {
  private readonly adapters = new Map<string, PlatformAdapter>();

  register(adapter: PlatformAdapter): void {
    const { integrationId } = adapter.manifest;
    if (this.adapters.has(integrationId)) {
      throw new Error(`INTEGRATION_ALREADY_REGISTERED:${integrationId}`);
    }
    this.adapters.set(integrationId, adapter);
  }

  inspect(integrationId: string): IntegrationEvidence {
    const adapter = this.adapters.get(integrationId);
    if (!adapter) {
      throw new Error(`INTEGRATION_NOT_REGISTERED:${integrationId}`);
    }
    return adapter.inspect();
  }

  readiness(integrationId: string): IntegrationStatus {
    const evidence = this.inspect(integrationId);
    if (evidence.blockers.length > 0) return "BLOCKED";
    if (evidence.checks.healthy === true) return "HEALTHY";
    if (evidence.checks.executable === true) return "EXECUTABLE";
    if (evidence.checks.available === true) return "AVAILABLE";
    if (evidence.checks.connected === true) return "CONNECTED";
    if (evidence.checks.configured === true) return "CONFIGURED";
    return "REGISTERED";
  }

  list(): PlatformIntegrationManifest[] {
    return [...this.adapters.values()].map((adapter) => adapter.manifest);
  }
}
