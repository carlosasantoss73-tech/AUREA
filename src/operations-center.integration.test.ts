import { describe, expect, it } from "vitest";
import { InMemoryOperationsStore, OperationsCenter } from "./operations-center";

describe("AUREA Operations Center lifecycle", () => {
  it("preserves project-specific state across a project switch", async () => {
    const store = new InMemoryOperationsStore();
    const center = new OperationsCenter(store);

    await center.openProject({ projectId: "a", name: "A", objective: "Objective A", state: "PAUSED" }, "s1");
    await center.checkpoint({
      id: "cp-a", projectId: "a", sessionId: "s1", state: "PAUSED", objective: "Objective A",
      workDone: ["work-a"], decisions: ["decision-a"], pending: ["pending-a"], nextAction: "next-a", evidence: ["evidence-a"],
    }, "2026-09-01T09:00:00.000Z");

    await center.openProject({ projectId: "b", name: "B", objective: "Objective B", state: "PAUSED" }, "s2");
    await center.checkpoint({
      id: "cp-b", projectId: "b", sessionId: "s2", state: "PAUSED", objective: "Objective B",
      workDone: ["work-b"], decisions: ["decision-b"], pending: ["pending-b"], nextAction: "next-b", evidence: ["evidence-b"],
    }, "2026-09-01T09:05:00.000Z");

    expect(await center.resume("a", "s3")).toMatchObject({
      id: "cp-a", projectId: "a", objective: "Objective A", workDone: ["work-a"], decisions: ["decision-a"],
      pending: ["pending-a"], nextAction: "next-a", evidence: ["evidence-a"],
    });
    expect(await center.resume("b", "s4")).toMatchObject({
      id: "cp-b", projectId: "b", objective: "Objective B", workDone: ["work-b"], decisions: ["decision-b"],
      pending: ["pending-b"], nextAction: "next-b", evidence: ["evidence-b"],
    });
  });
});
