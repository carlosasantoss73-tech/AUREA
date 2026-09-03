/**
 * AUREA Execution Runtime — first controlled execution boundary.
 *
 * Admission/authorization and provider selection already exist elsewhere.
 * This module performs the missing step: invoke an explicitly registered
 * execution adapter and return a traceable result envelope.
 *
 * It intentionally does not modify RuntimeAdmission, ProviderRuntime or the
 * Work Cell object in place. Persistence/state mutation belongs to a later
 * integration cell.
 */

import type { RuntimeAdmissionResult } from "./runtime-admission.js";
import type { ProviderRuntimeAdapter } from "./provider-runtime.js";

export interface ExecutionAdapterRequest {
  traceId: string;
  provider: ProviderRuntimeAdapter;
  input: unknown;
}

export interface ExecutionAdapterResponse {
  output: unknown;
  evidence: string[];
}

export interface ExecutionAdapter {
  providerId: string;
  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResponse>;
}

export type ExecutionRuntimeStatus = "SUCCEEDED" | "FAILED" | "BLOCKED" | "REPLAYED";

export interface ExecutionRuntimeResult {
  status: ExecutionRuntimeStatus;
  traceId: string;
  providerId?: string;
  modelId?: string;
  output?: unknown;
  evidence: string[];
  error?: string;
  replayOfTraceId?: string;
}

export interface ExecutionRuntimeRequest {
  admission: RuntimeAdmissionResult;
  provider: ProviderRuntimeAdapter;
  input: unknown;
}

/**
 * Executes only an already-admitted request. Unknown adapters and malformed
 * success responses fail closed. A traceId is also an idempotency key for the
 * lifetime of this runtime instance.
 */
export class ExecutionRuntime {
  private readonly adapters = new Map<string, ExecutionAdapter>();
  private readonly completed = new Map<string, ExecutionRuntimeResult>();

  registerAdapter(adapter: ExecutionAdapter): void {
    if (this.adapters.has(adapter.providerId)) {
      throw new Error(`EXECUTION_ADAPTER_ALREADY_REGISTERED:${adapter.providerId}`);
    }
    this.adapters.set(adapter.providerId, adapter);
  }

  async execute(request: ExecutionRuntimeRequest): Promise<ExecutionRuntimeResult> {
    const { admission, provider, input } = request;
    const traceId = admission.execution?.permission.traceId ?? "UNKNOWN_TRACE";

    if (admission.status !== "ADMITTED" || admission.execution?.status !== "AUTHORIZED") {
      return {
        status: "BLOCKED",
        traceId,
        evidence: [...admission.evidence],
        error: "EXECUTION_REQUIRES_ADMITTED_AUTHORIZED_RUNTIME",
      };
    }

    if (admission.providerId !== provider.providerId) {
      return {
        status: "BLOCKED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence],
        error: "EXECUTION_PROVIDER_MISMATCH",
      };
    }

    if (provider.status !== "EXECUTABLE") {
      return {
        status: "BLOCKED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence, `PROVIDER_STATUS:${provider.status}`],
        error: "EXECUTION_PROVIDER_NOT_EXECUTABLE",
      };
    }

    const previous = this.completed.get(traceId);
    if (previous) {
      return {
        ...previous,
        status: "REPLAYED",
        replayOfTraceId: previous.traceId,
        evidence: [...previous.evidence, `IDEMPOTENT_REPLAY:${traceId}`],
      };
    }

    const adapter = this.adapters.get(provider.providerId);
    if (!adapter) {
      return {
        status: "BLOCKED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence],
        error: `EXECUTION_ADAPTER_NOT_REGISTERED:${provider.providerId}`,
      };
    }

    try {
      const response = await adapter.execute({ traceId, provider, input });
      if (!response || !Array.isArray(response.evidence) || response.evidence.length === 0) {
        return {
          status: "FAILED",
          traceId,
          providerId: provider.providerId,
          modelId: provider.modelId,
          evidence: [...admission.evidence],
          error: "EXECUTION_RESULT_EVIDENCE_REQUIRED",
        };
      }

      const result: ExecutionRuntimeResult = {
        status: "SUCCEEDED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        output: response.output,
        evidence: [...new Set([...admission.evidence, ...response.evidence])],
      };
      this.completed.set(traceId, result);
      return result;
    } catch (error) {
      return {
        status: "FAILED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence],
        error: error instanceof Error ? error.message : "EXECUTION_ADAPTER_FAILED",
      };
    }
  }
}
