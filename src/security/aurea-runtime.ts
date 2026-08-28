/** AUREA Runtime P0 — one controlled execution path. */
import { buildExecutionEnvelope, assertExecutable, HarnessRequest } from "./aurea-harness";
import { supervise } from "./aurea-supervisor";
import { ContextRetrievalGate, RetrievedContext } from "../context/context-retrieval-gate";

export interface RegisteredTool { toolId: string; effectClass: HarnessRequest["effectClass"]; execute: (payload: unknown) => Promise<unknown> | unknown; }
export interface RuntimeResult {
  traceId: string;
  status: "EXECUTED" | "BLOCKED" | "TOOL_NOT_REGISTERED" | "DRY_RUN";
  reason: string;
  result?: unknown;
  context?: RetrievedContext;
}

export class AureaRuntime {
  private readonly tools = new Map<string, RegisteredTool>();
  constructor(private readonly contextGate?: ContextRetrievalGate) {}
  registerTool(tool: RegisteredTool): void { this.tools.set(tool.toolId, tool); }

  async execute(request: HarnessRequest): Promise<RuntimeResult> {
    const traceId = crypto.randomUUID();
    const tool = this.tools.get(request.toolId);
    if (!tool) return { traceId, status: "TOOL_NOT_REGISTERED", reason: "TOOL_NOT_REGISTERED_OR_ALLOWED" };
    if (tool.effectClass !== request.effectClass) return { traceId, status: "BLOCKED", reason: "EFFECT_CLASS_MISMATCH" };

    const envelope = buildExecutionEnvelope(request, traceId);
    const supervision = supervise(envelope);
    if (!supervision.approved) return { traceId: envelope.traceId, status: "BLOCKED", reason: supervision.reason };
    assertExecutable(envelope);

    let context: RetrievedContext | undefined;
    if (this.contextGate && request.contextQuery) {
      const retrieval = await this.contextGate.retrieve({
        actorId: request.actorId,
        actorRole: request.actorRole,
        projectId: request.projectId,
        query: request.contextQuery,
        allowedProjects: request.allowedProjects,
        allowedCapabilities: request.allowedCapabilities,
        allowedTools: request.allowedTools,
      });
      if (retrieval.status === "BLOCKED") return { traceId: envelope.traceId, status: "BLOCKED", reason: `CONTEXT_${retrieval.reason}` };
      if (retrieval.status === "EMPTY") return { traceId: envelope.traceId, status: "BLOCKED", reason: "CONTEXT_REQUIRED_BUT_NOT_FOUND" };
      context = retrieval.context;
    }

    if (request.dryRun) return { traceId: envelope.traceId, status: "DRY_RUN", reason: "DRY_RUN_NO_TOOL_EXECUTION", context };

    const payload = context
      ? (envelope.payload && typeof envelope.payload === "object" && !Array.isArray(envelope.payload)
        ? { ...(envelope.payload as Record<string, unknown>), __aureaContext: context }
        : { payload: envelope.payload, __aureaContext: context })
      : envelope.payload;
    const result = await tool.execute(payload);
    return { traceId: envelope.traceId, status: "EXECUTED", reason: "EXECUTION_ALLOWED", result, context };
  }
}
