export type OrchestratorStage =
  | "PREFLIGHT"
  | "KNOWLEDGE"
  | "STRATEGY"
  | "CREATIVE"
  | "SALES"
  | "QA"
  | "APPROVAL"
  | "EXECUTION"
  | "MEASUREMENT"
  | "CHECKPOINT";

export interface OrchestrationTask {
  id: string;
  name: string;
  stage: OrchestratorStage;
  dependsOn: string[];
  agent: string;
  status: "PENDING" | "READY" | "BLOCKED" | "DONE";
}

export interface OrchestrationPlan {
  projectId: string;
  objective: string;
  tasks: OrchestrationTask[];
  currentStage: OrchestratorStage;
}

/**
 * AUREA Orchestrator: coordinates specialized agents without replacing them.
 * It enforces the operational sequence and exposes parallel work where dependencies allow it.
 */
export class AureaOrchestrator {
  plan(projectId: string, objective: string, tasks: OrchestrationTask[]): OrchestrationPlan {
    const completed = new Set(tasks.filter(task => task.status === "DONE").map(task => task.id));
    const normalized = tasks.map(task => {
      if (task.status === "DONE") return task;
      const dependenciesReady = task.dependsOn.every(id => completed.has(id));
      return { ...task, status: dependenciesReady ? "READY" : "PENDING" };
    });

    const current = normalized.find(task => task.status === "READY") ?? normalized.find(task => task.status !== "DONE");

    return {
      projectId,
      objective,
      tasks: normalized,
      currentStage: current?.stage ?? "CHECKPOINT",
    };
  }
}
