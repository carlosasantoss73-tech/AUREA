export interface CommercialCampaignDefinition {
  id: "TCL-ECUADOR" | "TCL-CHILE";
  country: "ECUADOR" | "CHILE";
  dailyBudgetUsd: number;
  videos: string[];
  objective: "WHATSAPP_CONVERSATIONS";
  status: "DRAFT" | "READY_FOR_REVIEW" | "PAUSED";
}

/** Approved working structure for the first Terrazas Costa Limón commercial test.
 * No campaign is launched or charged by this definition alone.
 */
export const TERRAZAS_COMMERCIAL_CAMPAIGNS: CommercialCampaignDefinition[] = [
  {
    id: "TCL-ECUADOR",
    country: "ECUADOR",
    dailyBudgetUsd: 3,
    videos: ["Lote Ecuador", "Hectárea Ecuador"],
    objective: "WHATSAPP_CONVERSATIONS",
    status: "READY_FOR_REVIEW",
  },
  {
    id: "TCL-CHILE",
    country: "CHILE",
    dailyBudgetUsd: 2,
    videos: [
      "Lote — primera campaña Meta",
      "Hectárea — primera campaña Meta",
      "Lote Chile",
      "Hectárea Chile",
    ],
    objective: "WHATSAPP_CONVERSATIONS",
    status: "READY_FOR_REVIEW",
  },
];
