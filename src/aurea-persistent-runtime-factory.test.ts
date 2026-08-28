import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersistentAureaRuntime } from "./aurea-persistent-runtime-factory";
import { JsonContextStore } from "./context/persistent-context-store";

describe("Persistent AUREA Runtime", () => {
  it("uses durable context after runtime recreation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurea-runtime-"));
    const file = join(dir, "knowledge.json");
    const runtime1 = await createPersistentAureaRuntime(file);
    runtime1.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const first = await runtime1.execute({ actorId: "aureo", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ", allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"], payload: { query: "¿Qué herramientas de video trabajamos esta semana?" } });
    expect(first.status).toBe("EXECUTED");
    expect(first.context?.facts.join(" ")).toContain("MoneyPrinterTurbo");

    const store = new JsonContextStore(file);
    await store.initialize();
    await store.upsert({ id: "custom-memory", projectId: "aurea", title: "decisión creativa", text: "Krea queda como candidata prioritaria para Creative AI.", sourceId: "decision-test", version: 1, tags: ["Krea", "video", "creative"] });

    const runtime2 = await createPersistentAureaRuntime(file);
    runtime2.registerTool({ toolId: "knowledge.search", effectClass: "READ", execute: payload => payload });
    const second = await runtime2.execute({ actorId: "aureo", actorRole: "system", projectId: "aurea", capabilityId: "knowledge.read", toolId: "knowledge.search", action: "search", effectClass: "READ", allowedProjects: ["aurea"], allowedCapabilities: ["knowledge.read"], allowedTools: ["knowledge.search"], payload: { query: "¿Qué decisión creativa tomamos sobre Krea?" } });
    expect(second.status).toBe("EXECUTED");
    expect(second.context?.facts.join(" ")).toContain("Krea queda como candidata prioritaria");
    await rm(dir, { recursive: true, force: true });
  });
});
