import { describe, expect, it } from "vitest";
import { AureaPlatformIntegration, PlatformAdapter } from "./aurea-platform-integration.js";
import { ContextRetrievalGate } from "./context/context-retrieval-gate.js";
import { HealthLedger } from "./health-ledger.js";
import { AureaSentinel } from "./sentinel.js";
import { ProviderRuntime } from "./provider-runtime.js";
import { AureaExecutionGate } from "./execution-gate.js";
import { ExecutionStateBridge } from "./execution-state-bridge.js";
import { RuntimeAdmission } from "./runtime-admission.js";
import { WorkCell } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

const cell: WorkCell = {
  workCellId: "WC-RUNTIME-001", projectId: "PRJ-001", companyId: "CO-001", objective: "runtime admission",
  owner: "AGT-001", planner: "PLN-001", agents: ["AGT-001"], dependencies: [], restrictions: [],
  state: "READY", deliverables: [], evidence: [], qaStatus: "PENDING", auditStatus: "PENDING",
};

const platformAdapter: PlatformAdapter = {
  manifest: {
    integrationId: "INT-RUNTIME", componentId: "aurea-runtime", version: "0.1.0",
    boundaries: ["KNOWLEDGE", "EXECUTION", "SENTINEL"], requiredCapabilities: ["text"],
    requiredConfiguration: ["runtime"], healthChecks: ["healthy"], rollbackPlan: "disable",
  },
  inspect: () => ({
    integrationId: "INT-RUNTIME", status: "HEALTHY", checkedAt: "2026-09-03T00:00:00.000Z",
    checks: { configured: true, connected: true, available: true, executable: true, healthy: true },
    evidence: ["platform-health:pass"], blockers: [],
  }),
};

const contextProvider = {
  async retrieve(input: { projectId: string; query: string; traceId: string }) {
    return { projectId: input.projectId, query: input.query, facts: ["context:valid"], citations: [{ sourceId: "SRC-001" }] };
  },
};

function admission(registry?: WorkCellRegistry) {
  const platform = new AureaPlatformIntegration();
  platform.register(platformAdapter);
  const providers = new ProviderRuntime();
  providers.register({ providerId: "provider-live", modelId: "model-live", status: "EXECUTABLE", capabilities: ["text"], healthEvidence: ["health:pass"] });
  const executionGate = new AureaExecutionGate(new AureaSentinel(new HealthLedger()));
  const bridge = registry ? new ExecutionStateBridge(executionGate, registry) : undefined;
  return new RuntimeAdmission(platform, new ContextRetrievalGate(contextProvider), providers, executionGate, bridge);
}

describe("RuntimeAdmission", () => {
  it("admits only when platform, context, provider and execution gates agree", async () => {
    const result = await admission().admit({
      traceId: "TRACE-RUNTIME-001", integrationId: "INT-RUNTIME", workCell: cell,
      contextQuery: "continúa con el trabajo anterior", actorId: "AGT-001", actorRole: "ROLE-001",
      capabilityId: "CAP-001", toolId: "TOOL-001", action: "execute", effectClass: "READ",
      providerCapability: "text", allowedProjects: ["PRJ-001"], allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
    });
    expect(result.status).toBe("ADMITTED");
    expect(result.providerId).toBe("provider-live");
    expect(result.execution?.workCell.state).toBe("RUNNING");
  });

  it("commits READY -> RUNNING to the authoritative registry and preserves evidence", async () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);
    const result = await admission(registry).admit({
      traceId: "TRACE-RUNTIME-COMMIT-001", integrationId: "INT-RUNTIME", workCell: cell,
      contextQuery: "continúa con el trabajo anterior", actorId: "AGT-001", actorRole: "ROLE-001",
      capabilityId: "CAP-001", toolId: "TOOL-001", action: "execute", effectClass: "READ",
      providerCapability: "text", allowedProjects: ["PRJ-001"], allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
    });
    expect(result.status).toBe("ADMITTED");
    expect(registry.get(cell.workCellId).state).toBe("RUNNING");
    expect(registry.history(cell.workCellId).at(-1)?.to).toBe("RUNNING");
    expect(result.evidence).toContain("EXECUTION_STATE_COMMITTED");
  });

  it("fails closed when no executable provider exists", async () => {
    const platform = new AureaPlatformIntegration();
    platform.register(platformAdapter);
    const providers = new ProviderRuntime();
    const gate = new AureaExecutionGate(new AureaSentinel(new HealthLedger()));
    const runtime = new RuntimeAdmission(platform, new ContextRetrievalGate(contextProvider), providers, gate);
    const result = await runtime.admit({
      traceId: "TRACE-RUNTIME-002", integrationId: "INT-RUNTIME", workCell: cell,
      contextQuery: "continúa con el trabajo anterior", actorId: "AGT-001", actorRole: "ROLE-001",
      capabilityId: "CAP-001", toolId: "TOOL-001", action: "execute", effectClass: "READ", providerCapability: "text",
      allowedProjects: ["PRJ-001"], allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("NO_EXECUTABLE_PROVIDER_FOR_CAPABILITY");
  });
});
