/**
 * AUREA Execution Runtime — controlled execution boundary.
 *
 * Admission/authorization and provider selection already exist elsewhere.
 * This module invokes an explicitly registered execution adapter and returns
 * a traceable result envelope. Durable reservation/commit semantics prevent a
 * second provider call after a restart when a previous execution is ambiguous.
 */

import type { RuntimeAdmissionResult } from "./runtime-admission.js";
import type { ProviderRuntimeAdapter } from "./provider-runtime.js";
import type { ExecutionResultStore } from "./execution-result-store.js";

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
 * success responses fail closed. A traceId is an idempotency key for the
 * lifetime of this runtime and, when a result store is configured, across restarts.
 */
export class ExecutionRuntime {
  private readonly adapters = new Map<string, ExecutionAdapter>();
  private readonly completed = new Map<string, ExecutionRuntimeResult>();
  private readonly reserved = new Set<string>();
  private hydrated = false;

  constructor(private readonly resultStore?: ExecutionResultStore) {}

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

    const hydration = await this.ensureHydrated();
    if (hydration) {
      return {
        status: "BLOCKED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence, "RESULT_STORE_REQUIRED_FOR_IDEMPOTENCY", hydration],
        error: "EXECUTION_IDEMPOTENCY_STORE_UNAVAILABLE",
      };
    }

    const previous = this.completed.get(traceId);
    if (previous) return this.replay(previous);

    const reservation = await this.reserveTrace(traceId);
    if (reservation === "BLOCKED") {
      return {
        status: "BLOCKED",
        traceId,
        providerId: provider.providerId,
        modelId: provider.modelId,
        evidence: [...admission.evidence, "EXECUTION_TRACE_RESERVED"],
        error: "EXECUTION_IDEMPOTENCY_RESERVATION_EXISTS",
      };
    }
    if (reservation === "COMPLETED") {
      const durable = this.completed.get(traceId);
      if (!durable) {
        return {
          status: "BLOCKED",
          traceId,
          providerId: provider.providerId,
          modelId: provider.modelId,
          evidence: [...admission.evidence, "RESULT_STORE_COMPLETED_WITHOUT_RESULT"],
          error: "EXECUTION_RESULT_STORE_INCONSISTENT",
        };
      }
      return this.replay(durable);
    }

    const adapter = this.adapters.get(provider.providerId);
    if (!adapter) {
      await this.releaseTrace(traceId);
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
        await this.releaseTrace(traceId);
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

      if (this.resultStore) {
        try {
          await this.resultStore.commitCompleted(result);
        } catch (error) {
          return {
            status: "FAILED",
            traceId,
            providerId: provider.providerId,
            modelId: provider.modelId,
            evidence: [...result.evidence, "RESULT_NOT_DURABLY_PERSISTED", "TRACE_RESERVATION_RETAINED"],
            error: error instanceof Error ? error.message : "EXECUTION_RESULT_PERSISTENCE_FAILED",
          };
        }
      }

      this.completed.set(traceId, result);
      this.reserved.delete(traceId);
      return result;
    } catch (error) {
      await this.releaseTrace(traceId);
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

  private replay(previous: ExecutionRuntimeResult): ExecutionRuntimeResult {
    return {
      ...previous,
      status: "REPLAYED",
      replayOfTraceId: previous.traceId,
      evidence: [...previous.evidence, `IDEMPOTENT_REPLAY:${previous.traceId}`],
    };
  }

  private async ensureHydrated(): Promise<string | undefined> {
    if (!this.resultStore || this.hydrated) return undefined;
    try {
      const state = await this.resultStore.loadState();
      for (const result of state.completed) {
        if (result.status === "SUCCEEDED") this.completed.set(result.traceId, { ...result, evidence: [...result.evidence] });
      }
      for (const traceId of state.reservedTraceIds) this.reserved.add(traceId);
      this.hydrated = true;
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : "RESULT_STORE_LOAD_FAILED";
    }
  }

  private async reserveTrace(traceId: string): Promise<"RESERVED" | "COMPLETED" | "BLOCKED"> {
    if (this.reserved.has(traceId)) return "BLOCKED";
    if (!this.resultStore) {
      this.reserved.add(traceId);
      return "RESERVED";
    }
    try {
      const status = await this.resultStore.reserve(traceId);
      if (status === "COMPLETED") return "COMPLETED";
      this.reserved.add(traceId);
      return "RESERVED";
    } catch {
      return "BLOCKED";
    }
  }

  private async releaseTrace(traceId: string): Promise<void> {
    this.reserved.delete(traceId);
    if (this.resultStore) await this.resultStore.releaseReservation(traceId);
  }
}
