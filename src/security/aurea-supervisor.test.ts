import { describe, expect, it } from "vitest";
import { buildExecutionEnvelope } from "./aurea-harness";
import { supervise } from "./aurea-supervisor";

describe("AUREA Supervisor P0", () => {
  const base = {
    actorId: "agent-1",
    actorRole: "agent",
    projectId: "p1",
    capabilityId: "knowledge.read",
    toolId: "knowledge.search",
    action: "read",
    effectClass: "READ" as const,
    allowedProjects: ["p1"],
    allowedCapabilities: ["knowledge.read"],
    allowedTools: ["knowledge.search"],
  };

  it("approves a valid executable envelope", () => {
    const envelope = buildExecutionEnvelope(base);
    expect(supervise(envelope)).toMatchObject({ approved: true, reason: "SUPERVISED" });
  });

  it("rejects a blocked envelope", () => {
    const envelope = buildExecutionEnvelope({ ...base, allowedProjects: ["p2"] });
    expect(supervise(envelope)).toMatchObject({ approved: false, reason: "HARNESS_BLOCKED" });
  });

  it("rejects destructive work without human approval", () => {
    const envelope = buildExecutionEnvelope({ ...base, effectClass: "DESTRUCTIVE" });
    expect(supervise(envelope)).toMatchObject({ approved: false, reason: "HARNESS_BLOCKED" });
  });
});
