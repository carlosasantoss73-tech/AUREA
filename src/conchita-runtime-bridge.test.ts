import { describe, expect, it, vi } from "vitest";
import { ConchitaRuntimeBridge } from "./conchita-runtime-bridge.js";
import type { RuntimeAdmissionRequest } from "./runtime-admission.js";

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
});
