export type WorkPlannerStatus = "READY" | "BLOCKED" | "NEEDS_REVIEW";
export type AssetTreatment = "REUSE" | "ADAPT" | "COMPOSE" | "REPLACE" | "NEW";

export interface WorkPlanRequest {
  projectId: string;
  objective: string;
  requestedWork: string[];
}

export interface ExistingAsset {
  id: string;
  name: string;
  source: "KNOWLEDGE_OS" | "REPOSITORY" | "PROJECT" | "HISTORICAL";
  status: "IMPLEMENTED" | "DOCUMENTED" | "VALIDATED" | "HISTORICAL" | "UNKNOWN";
  capabilities: string[];
}

export interface WorkPlanItem {
  task: string;
  treatment: AssetTreatment;
  reuseAssetIds: string[];
  rationale: string;
  evidenceRequired: string[];
}

export interface WorkPlan {
  projectId: string;
  objective: string;
  status: WorkPlannerStatus;
  items: WorkPlanItem[];
  missingEvidence: string[];
  warnings: string[];
  createdAt: string;
}

export interface LibrarianConnection {
  searchAssets(query: string): Promise<ExistingAsset[]>;
}

/**
 * Pre-build gate: the planner must consult the Librarian before proposing new construction.
 * It does not write institutional knowledge and does not replace Knowledge OS.
 */
export class WorkPlanner {
  constructor(private readonly librarian: LibrarianConnection) {}

  async plan(request: WorkPlanRequest, now = new Date().toISOString()): Promise<WorkPlan> {
    const items: WorkPlanItem[] = [];
    const missingEvidence: string[] = [];
    const warnings: string[] = [];

    for (const task of request.requestedWork) {
      const assets = await this.librarian.searchAssets(task);
      const usable = assets.filter(asset => asset.status !== "UNKNOWN");
      const reusable = usable.filter(asset => asset.status === "IMPLEMENTED" || asset.status === "VALIDATED");

      if (reusable.length > 0) {
        items.push({
          task,
          treatment: reusable.length === 1 ? "REUSE" : "COMPOSE",
          reuseAssetIds: reusable.map(asset => asset.id),
          rationale: "Existe capacidad previa con evidencia suficiente para reutilizar o componer antes de crear.",
          evidenceRequired: ["Confirmar compatibilidad con el objetivo y proyecto actual"],
        });
        continue;
      }

      if (usable.length > 0) {
        items.push({
          task,
          treatment: "ADAPT",
          reuseAssetIds: usable.map(asset => asset.id),
          rationale: "Existe patrimonio relacionado, pero su estado no permite asumir reutilización directa.",
          evidenceRequired: ["Validar implementación y vigencia antes de activar"],
        });
        continue;
      }

      items.push({
        task,
        treatment: "NEW",
        reuseAssetIds: [],
        rationale: "No se encontró activo reutilizable en la consulta previa al Knowledge OS.",
        evidenceRequired: ["Registrar búsqueda y demostrar ausencia de activo aplicable"],
      });
      missingEvidence.push(`No existe activo reutilizable verificado para: ${task}`);
    }

    if (items.some(item => item.treatment === "NEW")) {
      warnings.push("NUEVO solo queda autorizado como propuesta; la construcción requiere evidencia de ausencia y revisión de arquitectura.");
    }

    return {
      projectId: request.projectId,
      objective: request.objective,
      status: missingEvidence.length > 0 ? "NEEDS_REVIEW" : "READY",
      items,
      missingEvidence,
      warnings,
      createdAt: now,
    };
  }
}
