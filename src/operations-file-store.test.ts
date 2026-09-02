import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OperationsCenter } from "./operations-center";
import { FileOperationsStore } from "./operations-file-store";

describe("FileOperationsStore", () => {
  it("recovers project and latest checkpoint after creating a new store instance", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurea-ops-"));
    const filePath = join(directory, "operations.json");

    try {
      const firstCenter = new OperationsCenter(new FileOperationsStore(filePath));
      await firstCenter.openProject({
        projectId: "terrazas",
        name: "Terrazas Costa Limón",
        objective: "Convertir leads en oportunidades",
        state: "ACTIVE",
        activeSessionId: "session-a",
      }, "session-a");
      const checkpoint = await firstCenter.checkpoint({
        id: "terrazas-cp-001",
        projectId: "terrazas",
        sessionId: "session-a",
        state: "PAUSED",
        objective: "Convertir leads en oportunidades",
        workDone: ["Preflight ejecutado"],
        decisions: ["REUSE: conversation-memory"],
        pending: ["Conectar canal comercial"],
        nextAction: "Conectar canal comercial",
        evidence: ["preflight-001"],
      }, "2026-09-01T12:00:00.000Z");

      const recoveredStore = new FileOperationsStore(filePath);
      const recoveredCenter = new OperationsCenter(recoveredStore);
      const recovered = await recoveredCenter.resume("terrazas", "session-b");

      expect(recovered).toEqual(checkpoint);
      expect(await recoveredStore.getProject("terrazas")).toMatchObject({
        state: "ACTIVE",
        activeSessionId: "session-b",
        lastCheckpointId: "terrazas-cp-001",
      });
      expect(JSON.parse(await readFile(filePath, "utf8")).checkpoints["terrazas-cp-001"]).toEqual(checkpoint);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
