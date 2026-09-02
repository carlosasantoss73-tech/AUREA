import { OperationsCenter, OperationsCheckpoint, OperationsProject } from "./operations-center";
import { WorkPlan, WorkPlanRequest, WorkPlanner } from "./work-planner";

export interface PreflightOperationsRequest extends WorkPlanRequest {
  projectName: string;
  sessionId: string;
}

export interface PreflightOperationsResult {
  project: OperationsProject;
  plan: WorkPlan;
  checkpoint: OperationsCheckpoint;
}

/**
 * Operating-system bridge: Preflight is executed inside an Operations Center project.
 * The bridge records the plan as the first operational checkpoint without writing
 * institutional knowledge back to the Knowledge OS.
 */
export class PreflightOperations {
  constructor(
    private readonly planner: WorkPlanner,
    private readonly operations: OperationsCenter,
  ) {}

  async start(request: PreflightOperationsRequest, now = new Date().toISOString()): Promise<PreflightOperationsResult> {
    const project: OperationsProject = {
      projectId: request.projectId,
      name: request.projectName,
      objective: request.objective,
      state: "ACTIVE",
      activeSessionId: request.sessionId,
    };

    await this.operations.openProject(project, request.sessionId);
    const plan = await this.planner.plan(request, now);

    const checkpoint = await this.operations.checkpoint({
      id: `${request.projectId}-preflight-${now.replace(/[^0-9]/g, "")}`,
      projectId: request.projectId,
      sessionId: request.sessionId,
      state: plan.status === "READY" ? "ACTIVE" : "PAUSED",
      objective: request.objective,
      workDone: ["Preflight ejecutado y consultado antes de construcción"],
      decisions: plan.items.map(item => `${item.task}: ${item.treatment}`),
      pending: plan.missingEvidence,
      nextAction: plan.status === "READY" ? "Iniciar ejecución del WorkPlan" : "Resolver evidencia pendiente antes de construir",
      evidence: plan.items.flatMap(item => item.evidenceRequired),
    }, now);

    return { project, plan, checkpoint };
  }
}
