import { describe, expect, it } from "vitest";
import { AureaRuntime } from "./aurea-runtime";

describe("AUREA Runtime librarian integration contract", () => {
  it("executes a read-only librarian capability only when registered and allowed", async () => {
    const runtime = new AureaRuntime();
    const calls: unknown[] = [];
    runtime.registerTool({
      toolId: "knowledge.search",
      effectClass: "READ",
      execute: (payload: unknown) => { calls.push(payload); return { records: ["r1"], sourceCount: 1 }; }
    });

    const result = await runtime.execute({
      actorId: "librarian",
      actorRole: "system",
      projectId: "aurea",
      capabilityId: "knowledge.read",
      toolId: "knowledge.search",
      action: "search",
      effectClass: "READ",
      allowedProjects: ["aurea"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
      payload: { query: "AUREA" }
    });

    expect(result.status).toBe("EXECUTED");
    expect(result.traceId).toBeTruthy();
    expect(result.result).toEqual({ records: ["r1"], sourceCount: 1 });
    expect(calls).toEqual([{ query: "AUREA" }]);
  });

  it("does not permit librarian reads outside the authorized project", async () => {
    const runtime = new AureaRuntime();
    let executed = false;
    runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: () => { executed = true; return {}; } });

    const result = await runtime.execute({
      actorId: "librarian",
      actorRole: "system",
      projectId: "other-project",
      capabilityId: "knowledge.read",
      toolId: "knowledge.search",
      action: "search",
      effectClass: "READ",
      allowedProjects: ["aurea"],
      allowedCapabilities: ["knowledge.read"],
      allowedTools: ["knowledge.search"],
      payload: { query: "AUREA" }
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.traceId).toBeTruthy();
    expect(executed).toBe(false);
  });
});
