export type MarketingChannel = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "GOOGLE" | "WHATSAPP" | "WEB";
export type CampaignObjective = "AWARENESS" | "ENGAGEMENT" | "LEADS" | "CONVERSATIONS" | "SALES";
export type ContentFormat = "REEL" | "POST" | "STORY" | "CAROUSEL" | "VIDEO" | "BLOG" | "AD";

export interface MarketingCampaignRequest {
  projectId: string;
  objective: string;
  offer: string;
  audience: string;
  channels: MarketingChannel[];
  campaignObjective: CampaignObjective;
  startDate: string;
  days: number;
}

export interface ContentItem {
  day: number;
  format: ContentFormat;
  channel: MarketingChannel;
  angle: string;
  callToAction: string;
}

export interface MarketingCampaignPlan {
  projectId: string;
  strategy: string;
  objective: CampaignObjective;
  channels: MarketingChannel[];
  contentCalendar: ContentItem[];
  launchChecklist: string[];
  measurementPlan: string[];
  approvalRequired: string[];
}

/**
 * AUREA Marketing Intelligence: plans growth campaigns from strategy through
 * daily content, launch controls and measurement. It does not promise virality;
 * it creates testable variants and learns from measured results.
 */
export class MarketingIntelligence {
  plan(request: MarketingCampaignRequest): MarketingCampaignPlan {
    const contentCalendar: ContentItem[] = [];
    const formats: ContentFormat[] = ["REEL", "STORY", "CAROUSEL", "POST"];
    const primaryChannel = request.channels[0] ?? "INSTAGRAM";

    for (let day = 1; day <= request.days; day += 1) {
      const format = formats[(day - 1) % formats.length];
      contentCalendar.push({
        day,
        format,
        channel: primaryChannel,
        angle: this.angleForDay(day),
        callToAction: request.campaignObjective === "SALES" || request.campaignObjective === "LEADS"
          ? "Solicitar información"
          : "Conocer más",
      });
    }

    return {
      projectId: request.projectId,
      strategy: `Posicionar ${request.offer} ante ${request.audience}, probar ángulos creativos y optimizar según resultados reales.`,
      objective: request.campaignObjective,
      channels: request.channels,
      contentCalendar,
      launchChecklist: [
        "Validar oferta, claims, derechos de uso y fuente vigente",
        "Revisar creatividad y adaptación por canal",
        "Definir audiencia, presupuesto y objetivo de conversión",
        "Configurar medición de clics, conversaciones, leads y ventas",
        "Programar publicaciones y preparar seguimiento comercial",
      ],
      measurementPlan: [
        "Alcance e impresiones",
        "Retención e interacción",
        "CTR y costo por clic",
        "Conversaciones/leads y costo por resultado",
        "Conversión a oportunidad y venta",
        "Aprendizajes y variantes ganadoras para la siguiente iteración",
      ],
      approvalRequired: [
        "Aprobación humana de claims sensibles o no verificados",
        "Aprobación de presupuesto y lanzamiento de publicidad pagada",
      ],
    };
  }

  private angleForDay(day: number): string {
    const angles = [
      "Problema real que el cliente reconoce",
      "Educación: cómo evitar el problema",
      "Historia/caso y transformación",
      "Objeción frecuente y respuesta",
    ];
    return angles[(day - 1) % angles.length];
  }
}
