import { describe, expect, it } from "vitest";
import { AureaRuntime } from "./aurea-runtime";

describe("AUREA Runtime P0", () => {
  it("executes only a registered tool through Gateway → Harness → Supervisor", async () => {
    const runtime = new AureaRuntime();
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: p => ({ received: p }) });
    const result = await runtime.execute({
      actorId: "agent-1", actorRole: "agent", projectId: "p1", capabilityId: "knowledge.read",
      toolId: "knowledge.search", action: "read", effectClass: "READ",
      allowedProjects: ["p1"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
      payload: { q: "AUREA" }
    });
    expect(result.status).toBe("EXECUTED");
    expect(result.result).toEqual({ received: { q: "AUREA" } });
    expect(result.traceId).toBeTruthy();
  });

  it("blocks an unregistered tool before execution", async () => {
    const runtime = new AureaRuntime();
    const result = await runtime.execute({
      actorId: "agent-1", actorRole: "agent", projectId: "p1", capabilityId: "knowledge.read",
      toolId: "unknown.tool", action: "read", effectClass: "READ"
    });
    expect(result.status).toBe("TOOL_NOT_REGISTERED");
  });

  it("requires human approval for destructive execution", async () => {
    const runtime = new AureaRuntime();
    runtime.registerTool({ toolId: "dangerous.delete", effectClass: "DESTRUCTIVE", execute: () => "deleted" });
    const result = await runtime.execute({
      actorId: "agent-1", actorRole: "agent", projectId: "p1", capabilityId: "danger.delete",
      toolId: "dangerous.delete", action: "delete", effectClass: "DESTRUCTIVE",
      allowedProjects: ["p1"], allowedCapabilities: ["danger.delete"], allowedTools: ["dangerous.delete"]
    });
    expect(result.status).toBe("BLOCKED");
  });
});
