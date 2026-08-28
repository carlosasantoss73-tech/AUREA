import { describe, expect, it } from "vitest";
import { assertExecutable, buildExecutionEnvelope } from "./aurea-harness";

describe("AUREA Harness P0", () => {
  const base = {
    actorId: "agent-1", actorRole: "agent", projectId: "p1",
    capabilityId: "knowledge.read", toolId: "knowledge.search", action: "read",
    effectClass: "READ" as const,
  };
  it("blocks a denied request", () => {
    const e = buildExecutionEnvelope({ ...base, allowedProjects: ["p2"] });
    expect(e.status).toBe("BLOCKED");
    expect(() => assertExecutable(e)).toThrow("AUREA_HARNESS_BLOCKED");
  });
  it("creates a ready envelope for an allowed request", () => {
    const e = buildExecutionEnvelope({ ...base, allowedProjects: ["p1"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"], payload: { ok: true } });
    expect(e.status).toBe("READY");
    expect(e.payload).toEqual({ ok: true });
  });
  it("keeps dry-run payload non-executable", () => {
    const e = buildExecutionEnvelope({ ...base, allowedProjects: ["p1"], dryRun: true, payload: { shouldNotExecute: true } });
    expect(e.status).toBe("READY");
    expect(e.payload).toBeUndefined();
  });
});
