import { MarketingCampaignPlan, MarketingCampaignRequest, MarketingIntelligence } from "./marketing-intelligence";
import { OperationsCenter, OperationsCheckpoint, OperationsProject } from "./operations-center";

export interface MarketingOperationsRequest extends MarketingCampaignRequest {
  projectName: string;
  sessionId: string;
}

export interface MarketingOperationsResult {
  project: OperationsProject;
  plan: MarketingCampaignPlan;
  checkpoint: OperationsCheckpoint;
}

/**
 * Connects Marketing Intelligence to the Operations Center.
 * Planning is recorded as operational state; publication/spend remains subject
 * to the approvals defined by the marketing plan.
 */
export class MarketingOperations {
  constructor(
    private readonly marketing: MarketingIntelligence,
    private readonly operations: OperationsCenter,
  ) {}

  async start(request: MarketingOperationsRequest, now = new Date().toISOString()): Promise<MarketingOperationsResult> {
    const project: OperationsProject = {
      projectId: request.projectId,
      name: request.projectName,
      objective: request.objective,
      state: "ACTIVE",
      activeSessionId: request.sessionId,
    };

    await this.operations.openProject(project, request.sessionId);
    const plan = this.marketing.plan(request);
    const checkpoint = await this.operations.checkpoint({
      id: `${request.projectId}-marketing-${now.replace(/[^0-9]/g, "")}`,
      projectId: request.projectId,
      sessionId: request.sessionId,
      state: plan.approvalRequired.length > 0 ? "PAUSED" : "ACTIVE",
      objective: request.objective,
      workDone: ["Plan de marketing generado", "Calendario de contenidos generado", "Plan de medición definido"],
      decisions: [
        `Objetivo: ${plan.objective}`,
        `Canales: ${plan.channels.join(", ")}`,
        "No se presume viralidad; se optimiza mediante pruebas y resultados medidos",
      ],
      pending: plan.approvalRequired,
      nextAction: plan.approvalRequired.length > 0
        ? "Resolver aprobaciones antes de lanzar o programar acciones restringidas"
        : "Ejecutar calendario y medir resultados",
      evidence: ["Plan de campaña", "Calendario de contenidos", "Plan de medición"],
    }, now);

    return { project, plan, checkpoint };
  }
}
