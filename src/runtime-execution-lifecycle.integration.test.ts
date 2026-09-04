import { describe, expect, it } from "vitest";
import { AureaPlatformIntegration, PlatformAdapter } from "./aurea-platform-integration.js";
import { ContextRetrievalGate } from "./context/context-retrieval-gate.js";
import { ExecutionResultLifecycle } from "./execution-result-lifecycle.js";
import { ExecutionResultQA } from "./execution-result-qa.js";
import { AureaExecutionGate } from "./execution-gate.js";
import { ExecutionRuntime, ExecutionAdapter } from "./execution-runtime.js";
import { ExecutionStateBridge } from "./execution-state-bridge.js";
import { HealthLedger } from "./health-ledger.js";
import { ProviderRuntime, ProviderRuntimeAdapter } from "./provider-runtime.js";
import { RuntimeAdmission } from "./runtime-admission.js";
import { AureaSentinel } from "./sentinel.js";
import { WorkCell } from "./work-cell.js";
import { WorkCellRegistry } from "./work-cell-registry.js";

const cell: WorkCell = {
  workCellId: "WC-E2E-001", projectId: "PRJ-E2E-001", companyId: "CO-001", objective: "controlled e2e execution",
  owner: "AGT-001", planner: "PLN-001", agents: ["AGT-001"], dependencies: [], restrictions: [],
  state: "READY", deliverables: [], evidence: [], qaStatus: "PENDING", auditStatus: "PENDING",
};

const platformAdapter: PlatformAdapter = {
  manifest: {
    integrationId: "INT-E2E", componentId: "aurea-runtime", version: "0.1.0",
    boundaries: ["KNOWLEDGE", "EXECUTION", "SENTINEL", "QA", "AUDIT"], requiredCapabilities: ["text"],
    requiredConfiguration: ["runtime"], healthChecks: ["healthy"], rollbackPlan: "disable",
  },
  inspect: () => ({
    integrationId: "INT-E2E", status: "HEALTHY", checkedAt: "2026-09-03T00:00:00.000Z",
    checks: { configured: true, connected: true, available: true, executable: true, healthy: true },
    evidence: ["platform-health:pass"], blockers: [],
  }),
};

const contextProvider = {
  async retrieve(input: { projectId: string; query: string; traceId: string }) {
    return {
      projectId: input.projectId,
      query: input.query,
      facts: ["context:valid"],
      citations: [{ sourceId: "SRC-E2E-001", documentId: "DOC-E2E-001", version: "v1" }],
    };
  },
};

const provider: ProviderRuntimeAdapter = {
  providerId: "provider-e2e",
  modelId: "model-e2e",
  status: "EXECUTABLE",
  capabilities: ["text"],
  healthEvidence: ["provider-health:pass"],
};

const adapter: ExecutionAdapter = {
  providerId: provider.providerId,
  async execute({ traceId }) {
    return { output: { ok: true, traceId }, evidence: ["RESULT_CAPTURED", "ADAPTER_EXECUTED"] };
  },
};

describe("Runtime -> Execution -> QA -> Audit -> Closure", () => {
  it("completes the controlled positive path against authoritative Work Cell state", async () => {
    const registry = new WorkCellRegistry();
    registry.register(cell);

    const platform = new AureaPlatformIntegration();
    platform.register(platformAdapter);
    const providers = new ProviderRuntime();
    providers.register(provider);
    const sentinel = new AureaSentinel(new HealthLedger());
    const executionGate = new AureaExecutionGate(sentinel);
    const stateBridge = new ExecutionStateBridge(executionGate, registry);
    const admission = new RuntimeAdmission(
      platform,
      new ContextRetrievalGate(contextProvider),
      providers,
      executionGate,
      stateBridge,
    );

    const admissionResult = await admission.admit({
      traceId: "TRACE-E2E-001", integrationId: "INT-E2E", workCell: cell,
      contextQuery: "continúa con el trabajo anterior", actorId: "AGT-001", actorRole: "ROLE-001",
      capabilityId: "CAP-001", toolId: "TOOL-001", action: "execute", effectClass: "READ",
      providerCapability: "text", allowedProjects: ["PRJ-E2E-001"],
      allowedCapabilities: ["CAP-001"], allowedTools: ["TOOL-001"],
    });

    expect(admissionResult.status).toBe("ADMITTED");
    expect(registry.get(cell.workCellId).state).toBe("RUNNING");

    const runtime = new ExecutionRuntime();
    runtime.registerAdapter(adapter);
    const execution = await runtime.execute({ admission: admissionResult, provider, input: { task: "e2e" } });
    expect(execution.status).toBe("SUCCEEDED");

    const qa = new ExecutionResultQA();
    const validation = qa.validate({
      result: execution,
      expectedTraceId: "TRACE-E2E-001",
      expectedProviderId: provider.providerId,
      requiredEvidence: ["RESULT_CAPTURED", "ADAPTER_EXECUTED"],
    });
    expect(validation.qaStatus).toBe("PASS");
    expect(validation.auditStatus).toBe("PASS");

    const lifecycle = new ExecutionResultLifecycle(registry);
    const closed = lifecycle.apply({
      workCellId: cell.workCellId,
      traceId: "TRACE-E2E-001",
      execution,
      validation,
    });

    expect(closed.status).toBe("CLOSED");
    expect(registry.get(cell.workCellId).state).toBe("CLOSED");
    expect(registry.history(cell.workCellId).map(event => event.to)).toEqual(["RUNNING", "QA", "COMPLETED", "CLOSED"]);
  });
});
