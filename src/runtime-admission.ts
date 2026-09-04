import { ContextRetrievalGate, ContextProvider } from "./context/context-retrieval-gate.js";
import { AureaExecutionGate, ExecutionGateRequest, ExecutionGateResult } from "./execution-gate.js";
import { ExecutionStateBridge } from "./execution-state-bridge.js";
import { AureaPlatformIntegration } from "./aurea-platform-integration.js";
import { ProviderRuntime } from "./provider-runtime.js";
import { WorkCell } from "./work-cell.js";

export interface RuntimeAdmissionRequest {
  traceId: string;
  integrationId: string;
  workCell: WorkCell;
  contextQuery: string;
  actorId: string;
  actorRole: string;
  capabilityId: string;
  toolId: string;
  action: string;
  effectClass: ExecutionGateRequest["effectClass"];
  providerCapability: string;
  preferredProviderId?: string;
  allowedProviderIds?: string[];
  allowedProjects?: string[];
  contextAllowedProjects?: string[];
  contextAllowedCapabilities?: string[];
  contextAllowedTools?: string[];
  allowedCapabilities?: string[];
  allowedTools?: string[];
  approvedByHuman?: boolean;
  maxCalls?: number;
  callsUsed?: number;
}

export interface RuntimeAdmissionResult {
  status: "ADMITTED" | "BLOCKED";
  blockers: string[];
  evidence: string[];
  contextStatus: "READY" | "NOT_NEEDED" | "EMPTY" | "BLOCKED";
  providerId?: string;
  execution?: ExecutionGateResult;
}

/**
 * C1/C2/C3/C7 integration boundary.
 * Admission proves platform, knowledge, provider and execution controls agree
 * before a Work Cell is allowed to enter RUNNING.
 *
 * When the state bridge is supplied, the authoritative Work Cell registry is
 * committed only after execution authorization succeeds.
 */
export class RuntimeAdmission {
  constructor(
    private readonly platform: AureaPlatformIntegration,
    private readonly contextGate: ContextRetrievalGate,
    private readonly providers: ProviderRuntime,
    private readonly executionGate: AureaExecutionGate,
    private readonly executionStateBridge?: ExecutionStateBridge,
  ) {}

  async admit(request: RuntimeAdmissionRequest): Promise<RuntimeAdmissionResult> {
    const blockers: string[] = [];
    const evidence: string[] = [`TRACE:${request.traceId}`, `WORK_CELL:${request.workCell.workCellId}`];

    let platformStatus;
    try {
      platformStatus = this.platform.readiness(request.integrationId);
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : "PLATFORM_INTEGRATION_CHECK_FAILED");
      return this.blocked(blockers, evidence, "BLOCKED");
    }
    evidence.push(`PLATFORM:${platformStatus}`);
    if (!["HEALTHY", "EXECUTABLE"].includes(platformStatus)) {
      blockers.push(`PLATFORM_NOT_READY:${platformStatus}`);
      return this.blocked(blockers, evidence, "BLOCKED");
    }

    const context = await this.contextGate.retrieve({
      actorId: request.actorId,
      actorRole: request.actorRole,
      projectId: request.workCell.projectId,
      query: request.contextQuery,
      allowedProjects: request.contextAllowedProjects ?? request.allowedProjects,
      allowedCapabilities: request.contextAllowedCapabilities,
      allowedTools: request.contextAllowedTools,
    });
    evidence.push(`CONTEXT:${context.status}`);
    if (context.status === "BLOCKED" || context.status === "EMPTY") {
      blockers.push(`CONTEXT_${context.status}:${context.reason}`);
      return this.blocked(blockers, evidence, context.status);
    }

    const provider = this.providers.select({
      requiredCapability: request.providerCapability,
      preferredProviderId: request.preferredProviderId,
      allowedProviderIds: request.allowedProviderIds,
    });
    evidence.push(...provider.evidence.map(item => `PROVIDER:${item}`));
    if (provider.status === "BLOCKED" || !provider.provider) {
      blockers.push(...provider.blockers);
      return this.blocked(blockers, evidence, context.status);
    }

    const executionRequest: ExecutionGateRequest = {
      traceId: request.traceId,
      workCell: request.workCell,
      actorId: request.actorId,
      actorRole: request.actorRole,
      capabilityId: request.capabilityId,
      toolId: request.toolId,
      action: request.action,
      effectClass: request.effectClass,
      allowedProjects: request.allowedProjects,
      allowedCapabilities: request.allowedCapabilities,
      allowedTools: request.allowedTools,
      approvedByHuman: request.approvedByHuman,
      maxCalls: request.maxCalls,
      callsUsed: request.callsUsed,
    };

    const execution = this.executionStateBridge
      ? this.executionStateBridge.authorizeAndCommit(executionRequest)
      : this.executionGate.authorize(executionRequest);

    evidence.push(...execution.evidence);
    if ("stateCommitted" in execution && execution.stateCommitted) {
      evidence.push("EXECUTION_STATE_COMMITTED");
    }
    if (execution.status === "BLOCKED") {
      blockers.push(...execution.blockers);
      return { status: "BLOCKED", blockers, evidence, contextStatus: context.status, providerId: provider.provider.providerId, execution };
    }

    return {
      status: "ADMITTED",
      blockers: [],
      evidence,
      contextStatus: context.status,
      providerId: provider.provider.providerId,
      execution,
    };
  }

  private blocked(blockers: string[], evidence: string[], contextStatus: RuntimeAdmissionResult["contextStatus"]): RuntimeAdmissionResult {
    return { status: "BLOCKED", blockers, evidence, contextStatus };
  }
}

export function createRuntimeAdmission(
  platform: AureaPlatformIntegration,
  contextProvider: ContextProvider,
  providers: ProviderRuntime,
  executionGate: AureaExecutionGate,
  executionStateBridge?: ExecutionStateBridge,
): RuntimeAdmission {
  return new RuntimeAdmission(platform, new ContextRetrievalGate(contextProvider), providers, executionGate, executionStateBridge);
}
