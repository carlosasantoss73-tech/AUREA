import type {
  ConchitaMessageResponse,
  ConchitaMode,
  ConchitaPersonalRequestHandler,
  ConchitaSession,
} from "./conchita-personal-v0-gateway.js";
import type { ExecutionRuntime, ExecutionRuntimeResult } from "./execution-runtime.js";
import type { RuntimeAdmission, RuntimeAdmissionRequest } from "./runtime-admission.js";
import type { ProviderRuntime } from "./provider-runtime.js";

export interface ConchitaRuntimeAdmissionFactory {
  build(request: {
    session: ConchitaSession;
    message: string;
    mode: ConchitaMode;
    traceId: string;
  }): RuntimeAdmissionRequest;
}

export class ConchitaRuntimeBridge implements ConchitaPersonalRequestHandler {
  constructor(
    private readonly admission: RuntimeAdmission,
    private readonly providers: ProviderRuntime,
    private readonly execution: ExecutionRuntime,
    private readonly admissionFactory: ConchitaRuntimeAdmissionFactory,
  ) {}

  async handle(request: {
    session: ConchitaSession;
    message: string;
    mode: ConchitaMode;
    traceId: string;
  }): Promise<Pick<ConchitaMessageResponse, "status" | "response" | "evidence" | "blockers">> {
    const admissionRequest = this.admissionFactory.build(request);
    const admitted = await this.admission.admit(admissionRequest);

    if (admitted.status !== "ADMITTED" || !admitted.providerId) {
      return { status: "BLOCKED", response: undefined, evidence: [...admitted.evidence], blockers: [...admitted.blockers] };
    }

    const selected = this.providers.select({
      requiredCapability: admissionRequest.providerCapability,
      preferredProviderId: admitted.providerId,
      allowedProviderIds: admissionRequest.allowedProviderIds,
    });

    if (selected.status !== "SELECTED" || !selected.provider) {
      return {
        status: "BLOCKED", response: undefined,
        evidence: [...admitted.evidence, ...selected.evidence], blockers: [...selected.blockers],
      };
    }

    const result = await this.execution.execute({
      admission: admitted,
      provider: selected.provider,
      input: { message: request.message, mode: request.mode },
    });

    return this.toConchitaResult(result);
  }

  private toConchitaResult(
    result: ExecutionRuntimeResult,
  ): Pick<ConchitaMessageResponse, "status" | "response" | "evidence" | "blockers"> {
    const completed = result.status === "SUCCEEDED" || result.status === "REPLAYED";
    return {
      status: completed ? "COMPLETED" : "BLOCKED",
      response: completed && typeof result.output === "string" ? result.output : undefined,
      evidence: [...result.evidence],
      blockers: result.error ? [result.error] : [],
    };
  }
}
