/** AUREA Runtime P0 — one controlled execution path. */
import { buildExecutionEnvelope, assertExecutable, HarnessRequest } from "./aurea-harness";
import { supervise } from "./aurea-supervisor";

export interface RegisteredTool { toolId: string; effectClass: HarnessRequest["effectClass"]; execute: (payload: unknown) => Promise<unknown> | unknown; }
export interface RuntimeResult { traceId: string; status: "EXECUTED" | "BLOCKED" | "TOOL_NOT_REGISTERED"; reason: string; result?: unknown; }

export class AureaRuntime {
  private readonly tools = new Map<string, RegisteredTool>();
  registerTool(tool: RegisteredTool): void { this.tools.set(tool.toolId, tool); }

  async execute(request: HarnessRequest): Promise<RuntimeResult> {
    const tool = this.tools.get(request.toolId);
    if (!tool) return { traceId: "", status: "TOOL_NOT_REGISTERED", reason: "TOOL_NOT_REGISTERED_OR_ALLOWED" };
    if (tool.effectClass !== request.effectClass) return { traceId: "", status: "BLOCKED", reason: "EFFECT_CLASS_MISMATCH" };

    const envelope = buildExecutionEnvelope(request);
    const supervision = supervise(envelope);
    if (!supervision.approved) return { traceId: envelope.traceId, status: "BLOCKED", reason: supervision.reason };
    assertExecutable(envelope);

    const result = await tool.execute(envelope.payload);
    return { traceId: envelope.traceId, status: "EXECUTED", reason: "EXECUTION_ALLOWED", result };
  }
}
