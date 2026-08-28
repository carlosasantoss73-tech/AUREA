import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersistentAureaMemory } from "../aurea-persistent-runtime-factory";

describe("AUREA memory black-box", () => {
  it("ingests real supplied evidence, recreates runtime, and retrieves it without a memory command", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-blackbox-"));
    const file = join(dir, "knowledge.json");
    const memory1 = await createPersistentAureaMemory(file);
    const ingested = await memory1.ingest({ projectId: "aurea", sourceId: "conversation:real-supplied", title: "Krea decision", text: "Krea queda como candidata prioritaria para Creative AI.", tags: ["Krea", "video", "creative"] });
    expect(ingested.action).toBe("CREATED");

    const memory2 = await createPersistentAureaMemory(file);
    memory2.runtime.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const result = await memory2.runtime.execute({
      actorId: "aureo", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ",
      allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"],
      payload: { query: "¿Qué decisión tomamos sobre Krea?" },
    });
    expect(result.status).toBe("EXECUTED");
    expect(result.context?.facts.join(" ")).toContain("Krea queda como candidata prioritaria");
    expect(result.context?.citations[0]).toMatchObject({ sourceId: "conversation:real-supplied", version: 1 });
    await rm(dir, { recursive: true, force: true });
  });
});
