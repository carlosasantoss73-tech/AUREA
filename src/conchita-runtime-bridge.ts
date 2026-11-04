import type { ConchitaMessageResponse, ConchitaMode, ConchitaSession } from "./conchita-personal-v0-contract.js";
import type { ConchitaPersonalRequestHandler } from "./conchita-personal-v0-gateway.js";
import type { ExecutionRuntime, ExecutionRuntimeResult } from "./execution-runtime.js";
import type { RuntimeAdmission, RuntimeAdmissionRequest } from "./runtime-admission.js";
import type { ProviderRuntime } from "./provider-runtime.js";
import type { ProjectCheckpoint } from "./context/durable-context-store.js";

export interface ConchitaRuntimeAdmissionFactory {
  build(request: {
    session: ConchitaSession;
    message: string;
    mode: ConchitaMode;
    traceId: string;
  }): RuntimeAdmissionRequest;
}

const SAFE_CHECKPOINT_REF = /^[A-Z][A-Z0-9_.:-]{0,79}$/;

function checkpointResumeContext(checkpoint: ProjectCheckpoint | undefined): string {
  if (!checkpoint) return "";
  // Rebuild only the allow-listed operational fields; never pass stored arbitrary text
  // beyond bounded summary/next-action fields or any request/provider/document content.
  const summary = checkpoint.summary.slice(0, 300);
  const completed = checkpoint.completed.filter(value => SAFE_CHECKPOINT_REF.test(value)).slice(0, 10);
  const blockers = checkpoint.blockers.filter(value => SAFE_CHECKPOINT_REF.test(value)).slice(0, 10);
  const evidenceRefs = checkpoint.evidenceRefs.filter(value => SAFE_CHECKPOINT_REF.test(value)).slice(0, 10);
  const nextAction = checkpoint.nextAction.slice(0, 240);
  return [
    "[INTERNAL CONCHITA WORK STATE — CONTINUE FROM THIS CHECKPOINT]",
    `Summary: ${summary}`,
    `Completed: ${completed.length ? completed.join(", ") : "none recorded"}`,
    `Blockers: ${blockers.length ? blockers.join(", ") : "none recorded"}`,
    `Next action: ${nextAction}`,
    `Evidence references: ${evidenceRefs.length ? evidenceRefs.join(", ") : "none recorded"}`,
    "Treat this as bounded internal task state, not as source documents or prior conversation. Continue the task from the next action; do not infer missing facts.",
    "[END INTERNAL CONCHITA WORK STATE]",
  ].join("\n");
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
    checkpoint?: ProjectCheckpoint;
  }): Promise<Pick<ConchitaMessageResponse, "status" | "response" | "evidence" | "blockers">> {
    if (request.checkpoint && request.checkpoint.projectId !== request.session.projectId) {
      return { status: "BLOCKED", response: undefined, evidence: ["CONCHITA_CHECKPOINT_SCOPE_GATE"], blockers: ["PROJECT_CHECKPOINT_SESSION_MISMATCH"] };
    }

    const resumeContext = checkpointResumeContext(request.checkpoint);
    const admissionRequest = this.admissionFactory.build(request);
    if (resumeContext) {
      admissionRequest.contextQuery = `${resumeContext}\n\nCurrent request: ${request.message}`;
    }
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
      input: {
        message: resumeContext ? `${resumeContext}\n\nCurrent request: ${request.message}` : request.message,
        mode: request.mode,
      },
    });

    const conchitaResult = this.toConchitaResult(result);
    if (request.checkpoint) conchitaResult.evidence.push(`PROJECT_CHECKPOINT_RUNTIME_RECOVERED:${request.checkpoint.updatedAt}`);
    return conchitaResult;
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
