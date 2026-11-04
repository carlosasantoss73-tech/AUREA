import { describe, expect, it, vi } from "vitest";
import { ConchitaRuntimeBridge } from "./conchita-runtime-bridge.js";
import type { RuntimeAdmissionRequest } from "./runtime-admission.js";
import { ExecutionRuntime, type ExecutionAdapterRequest } from "./execution-runtime.js";
import { ProviderRuntime } from "./provider-runtime.js";
import type { ProjectCheckpoint } from "./context/durable-context-store.js";
import { CONCHITA_PILOT_PROJECT_ID } from "./conchita-project-checkpoint-runtime.js";

const admissionRequest: RuntimeAdmissionRequest = {
  traceId: "trace-1",
  integrationId: "xolar",
  workCell: {
    workCellId: "cell-1",
    projectId: "project-1",
    state: "READY",
    objective: "Respond to owner",
    responsibleAgentId: "conchita",
    plannerAgentId: "planner",
    context: {},
    resources: [],
    dependencies: [],
    restrictions: [],
    deliverables: [],
    qaStatus: "PENDING",
    auditStatus: "PENDING",
    evidence: [],
  } as never,
  contextQuery: "owner conversation",
  actorId: "owner-1",
  actorRole: "OWNER",
  capabilityId: "conversation",
  toolId: "chat",
  action: "respond",
  effectClass: "READ",
  providerCapability: "text-generation",
};

describe("Conchita runtime bridge", () => {
  it("converges an authorized request into the existing runtime", async () => {
    const admit = vi.fn().mockResolvedValue({
      status: "ADMITTED",
      blockers: [],
      evidence: ["ADMITTED"],
      contextStatus: "READY",
      providerId: "provider-1",
      execution: { status: "AUTHORIZED", permission: { traceId: "trace-1" }, evidence: [] },
    });
    const select = vi.fn().mockReturnValue({
      status: "SELECTED",
      provider: { providerId: "provider-1", modelId: "model-1", status: "EXECUTABLE", capabilities: ["text-generation"], healthEvidence: [] },
      blockers: [],
      evidence: ["SELECTED"],
    });
    const execute = vi.fn().mockResolvedValue({
      status: "SUCCEEDED",
      traceId: "trace-1",
      providerId: "provider-1",
      modelId: "model-1",
      output: "Hola, Carlos.",
      evidence: ["EXECUTED"],
    });

    const bridge = new ConchitaRuntimeBridge(
      { admit } as never,
      { select } as never,
      { execute } as never,
      { build: vi.fn(() => admissionRequest) },
    );

    const result = await bridge.handle({
      session: { sessionId: "sess-1", userId: "owner-1", channel: "MOBILE_APP", mode: "PERSONAL", createdAt: "now" },
      message: "Hola Conchita",
      mode: "PERSONAL",
      traceId: "trace-1",
    });

    expect(result).toMatchObject({ status: "COMPLETED", response: "Hola, Carlos." });
    expect(admit).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("fails closed before provider execution when admission blocks", async () => {
    const execute = vi.fn();
    const bridge = new ConchitaRuntimeBridge(
      { admit: vi.fn().mockResolvedValue({ status: "BLOCKED", blockers: ["NO_CONTEXT"], evidence: ["BLOCKED"], contextStatus: "BLOCKED" }) } as never,
      { select: vi.fn() } as never,
      { execute } as never,
      { build: () => admissionRequest },
    );

    const result = await bridge.handle({
      session: { sessionId: "sess-1", userId: "owner-1", channel: "MOBILE_APP", mode: "PERSONAL", createdAt: "now" },
      message: "ejecuta",
      mode: "PERSONAL",
      traceId: "trace-2",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(["NO_CONTEXT"]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("feeds recovered allow-listed work state through the real bridge to the execution adapter", async () => {
    const checkpoint: ProjectCheckpoint = {
      schemaVersion: 1,
      projectId: CONCHITA_PILOT_PROJECT_ID,
      updatedAt: "2026-10-24T12:01:00.000Z",
      summary: "Survey processing pilot is partially complete.",
      completed: ["SURVEY_FILES_INDEXED", "ROW_COUNTS_VERIFIED"],
      blockers: ["MISSING_APPROVED_TEMPLATE"],
      nextAction: "Verify the authorized template before processing remaining records.",
      evidenceRefs: ["CI_TEST_230", "SURVEY_COUNT_CHECK"],
    };
    const providerRuntime = new ProviderRuntime();
    providerRuntime.register({
      providerId: "provider-1",
      modelId: "model-1",
      status: "EXECUTABLE",
      capabilities: ["text-generation"],
      healthEvidence: ["SIMULATED_PROVIDER_READY"],
    });
    const execution = new ExecutionRuntime();
    let adapterRequest: ExecutionAdapterRequest | undefined;
    execution.registerAdapter({
      providerId: "provider-1",
      async execute(request) {
        adapterRequest = request;
        return { output: "continued", evidence: ["SIMULATED_ADAPTER_EXECUTED"] };
      },
    });
    let contextQuery = "";
    const admission = {
      admit: vi.fn().mockImplementation(async (request: RuntimeAdmissionRequest) => {
        contextQuery = request.contextQuery;
        return {
          status: "ADMITTED",
          blockers: [],
          evidence: ["ADMITTED"],
          contextStatus: "READY",
          providerId: "provider-1",
          execution: { status: "AUTHORIZED", permission: { traceId: "trace-resume" }, evidence: ["AUTHORIZED"] },
        };
      }),
    };
    const bridge = new ConchitaRuntimeBridge(
      admission as never,
      providerRuntime,
      execution,
      { build: () => ({ ...admissionRequest, workCell: { ...admissionRequest.workCell, projectId: CONCHITA_PILOT_PROJECT_ID } }) },
    );

    const result = await bridge.handle({
      session: {
        sessionId: "pilot-session",
        userId: "pilot-user",
        channel: "MOBILE_APP",
        mode: "PERSONAL",
        createdAt: "2026-10-24T12:00:00.000Z",
        projectId: CONCHITA_PILOT_PROJECT_ID,
      },
      message: "Continue the remaining survey processing.",
      mode: "PERSONAL",
      traceId: "trace-resume",
      checkpoint,
    });

    expect(result).toMatchObject({ status: "COMPLETED", response: "continued" });
    expect(admission.admit).toHaveBeenCalledOnce();
    expect(contextQuery).toContain("Summary: Survey processing pilot is partially complete.");
    expect(contextQuery).toContain("Completed: SURVEY_FILES_INDEXED, ROW_COUNTS_VERIFIED");
    expect(contextQuery).toContain("Blockers: MISSING_APPROVED_TEMPLATE");
    expect(contextQuery).toContain("Next action: Verify the authorized template before processing remaining records.");
    expect(contextQuery).toContain("Evidence references: CI_TEST_230, SURVEY_COUNT_CHECK");
    expect(adapterRequest).toBeDefined();
    const providerInput = (adapterRequest!.input as { message: string }).message;
    expect(providerInput).toContain("Summary: Survey processing pilot is partially complete.");
    expect(providerInput).toContain("Next action: Verify the authorized template before processing remaining records.");
    expect(providerInput).toContain("Current request: Continue the remaining survey processing.");
    expect(providerInput).not.toContain("document source text must not be included");
    expect(providerInput).not.toContain("provider output must not be included");
  });

});
