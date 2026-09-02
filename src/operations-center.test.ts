import { describe, expect, it } from "vitest";
import { InMemoryOperationsStore, OperationsCenter } from "./operations-center";

describe("AUREA Operations Center continuity", () => {
  it("recovers the exact latest checkpoint after switching projects", async () => {
    const center = new OperationsCenter(new InMemoryOperationsStore());

    await center.openProject({
      projectId: "terrazas",
      name: "Terrazas Costa Limón",
      objective: "Generar ventas de terrenos",
      state: "PAUSED",
    }, "session-a");

    await center.checkpoint({
      id: "cp-terrazas-001",
      projectId: "terrazas",
      sessionId: "session-a",
      state: "PAUSED",
      objective: "Generar ventas de terrenos",
      workDone: ["Definimos la propuesta comercial"],
      decisions: ["Priorizar captación digital"],
      pending: ["Preparar campaña"],
      nextAction: "Crear campaña de prueba",
      evidence: ["brief-001"],
    }, "2026-09-01T09:00:00.000Z");

    await center.openProject({
      projectId: "xolar",
      name: "XOLAR",
      objective: "Desarrollar solución solar",
      state: "PAUSED",
    }, "session-b");

    const recovered = await center.resume("terrazas", "session-c");

    expect(recovered).toEqual({
      id: "cp-terrazas-001",
      projectId: "terrazas",
      sessionId: "session-a",
      state: "PAUSED",
      objective: "Generar ventas de terrenos",
      workDone: ["Definimos la propuesta comercial"],
      decisions: ["Priorizar captación digital"],
      pending: ["Preparar campaña"],
      nextAction: "Crear campaña de prueba",
      evidence: ["brief-001"],
      updatedAt: "2026-09-01T09:00:00.000Z",
    });
  });
});
