import { describe, expect, it } from "vitest";
import { MarketingIntelligence } from "./marketing-intelligence";

describe("AUREA Marketing Intelligence", () => {
  it("creates a measurable multi-day campaign plan", () => {
    const plan = new MarketingIntelligence().plan({
      projectId: "terrazas",
      objective: "Generate qualified conversations",
      offer: "Terrazas Costa Limón",
      audience: "Personas interesadas en inversión inmobiliaria",
      channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
      campaignObjective: "CONVERSATIONS",
      startDate: "2026-09-01",
      days: 7,
    });

    expect(plan.contentCalendar).toHaveLength(7);
    expect(plan.contentCalendar.map(item => item.format)).toEqual([
      "REEL", "STORY", "CAROUSEL", "POST", "REEL", "STORY", "CAROUSEL",
    ]);
    expect(plan.measurementPlan).toContain("Conversaciones/leads y costo por resultado");
    expect(plan.launchChecklist).toContain("Configurar medición de clics, conversaciones, leads y ventas");
  });

  it("requires human approval for paid launch and sensitive claims", () => {
    const plan = new MarketingIntelligence().plan({
      projectId: "p",
      objective: "Sales",
      offer: "Offer",
      audience: "Audience",
      channels: ["INSTAGRAM"],
      campaignObjective: "SALES",
      startDate: "2026-09-01",
      days: 1,
    });

    expect(plan.approvalRequired).toHaveLength(2);
  });
});
