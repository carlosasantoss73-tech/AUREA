import { describe, expect, it } from "vitest";
import { MarketingIntelligence } from "./marketing-intelligence";
import { MarketingOperations } from "./marketing-operations";
import { InMemoryOperationsStore, OperationsCenter } from "./operations-center";

describe("MarketingOperations", () => {
  it("records a marketing plan as an operational checkpoint and pauses for approval", async () => {
    const operations = new OperationsCenter(new InMemoryOperationsStore());
    const service = new MarketingOperations(new MarketingIntelligence(), operations);

    const result = await service.start({
      projectId: "terrazas",
      projectName: "Terrazas Costa Limón",
      sessionId: "session-1",
      objective: "Generar conversaciones comerciales calificadas",
      offer: "Proyecto inmobiliario",
      audience: "Personas interesadas en adquirir un terreno",
      channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
      campaignObjective: "CONVERSATIONS",
      startDate: "2026-09-01",
      days: 7,
    });

    expect(result.plan.contentCalendar).toHaveLength(7);
    expect(result.checkpoint.state).toBe("PAUSED");
    expect(result.checkpoint.pending).toContain("Aprobación de presupuesto y lanzamiento de publicidad pagada");

    const recovered = await operations.resume("terrazas", "session-2");
    expect(recovered?.id).toBe(result.checkpoint.id);
    expect(recovered?.projectId).toBe("terrazas");
  });
});
