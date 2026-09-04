import type { ConchitaMessageResponse } from "./conchita-personal-v0-contract.js";
import type { ExecutionRuntime } from "./execution-runtime.js";
import type { ExecutionRuntimeResult } from "./execution-runtime.js";
import type { RuntimeAdmission, RuntimeAdmissionRequest } from "./runtime-admission.js";
import type { ProviderRuntime } from "./provider-runtime.js";

export interface ConchitaRuntimeRequest {
  admission: RuntimeAdmissionRequest;
  message: string;
}

/**
 * Server-side convergence point for Conchita Personal V0.
 * It deliberately keeps transport/session concerns outside the execution path:
 * admission remains authoritative, provider selection remains deterministic,
 * and ExecutionRuntime remains the only component allowed to execute an adapter.
 */
export class ConchitaRuntimeBridge {
  constructor(
    private readonly admission: RuntimeAdmission,
    private readonly providers: ProviderRuntime,
    private readonly execution: ExecutionRuntime,
  ) {}

  async handle(request: ConchitaRuntimeRequest): Promise<ConchitaMessageResponse> {
    const admitted = await this.admission.admit(request.admission);
    if (admitted.status !== "ADMITTED" || !admitted.providerId) {
      return {
        sessionId: request.admission.workCell.workCellId,
        clientRequestId: request.admission.traceId,
        traceId: request.admission.traceId,
        status: "BLOCKED",
        evidence: [...admitted.evidence],
        blockers: [...admitted.blockers],
      };
    }

    const selected = this.providers.select({
      requiredCapability: request.admission.providerCapability,
      preferredProviderId: admitted.providerId,
      allowedProviderIds: request.admission.allowedProviderIds,
    });

    if (selected.status !== "SELECTED" || !selected.provider) {
      return {
        sessionId: request.admission.workCell.workCellId,
        clientRequestId: request.admission.traceId,
        traceId: request.admission.traceId,
        status: "BLOCKED",
        evidence: [...admitted.evidence, ...selected.evidence],
        blockers: [...selected.blockers],
      };
    }

    const result = await this.execution.execute({
      admission: admitted,
      provider: selected.provider,
      input: { message: request.message },
    });

    return this.toConchitaResponse(result, request.admission);
  }

  private toConchitaResponse(
    result: ExecutionRuntimeResult,
    admission: RuntimeAdmissionRequest,
  ): ConchitaMessageResponse {
    const completed = result.status === "SUCCEEDED" || result.status === "REPLAYED";
    return {
      sessionId: admission.workCell.workCellId,
      clientRequestId: admission.traceId,
      traceId: result.traceId,
      status: completed ? "COMPLETED" : "BLOCKED",
      response: completed && typeof result.output === "string" ? result.output : undefined,
      evidence: [...result.evidence],
      blockers: result.error ? [result.error] : [],
    };
  }
}
