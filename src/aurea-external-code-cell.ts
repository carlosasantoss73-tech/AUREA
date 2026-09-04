/**
 * AUREA External Code Work Cell contract.
 *
 * This boundary makes an external coding agent an explicit, auditable cell.
 * It does not imply that any external model is connected or executable.
 */

export type ExternalCodeCellStatus =
  | "REGISTERED"
  | "CONFIGURED"
  | "CONNECTED"
  | "EXECUTABLE"
  | "BLOCKED";

export interface ExternalCodeCellRequest {
  cellId: string;
  traceId: string;
  objective: string;
  companyScope: string;
  projectScope: string;
  responsibility: string;
  requiredCapabilities: string[];
  authorityLevel: string;
  allowedKnowledge: string[];
  restrictions: string[];
  dependencies: string[];
  inputEvidence: string[];
  expectedOutput: string[];
  validationCriteria: string[];
}

export interface ExternalCodeCellResult {
  cellId: string;
  traceId: string;
  status: "COMPLETED" | "BLOCKED" | "FAILED";
  result: string;
  facts: string[];
  inferences: string[];
  assumptions: string[];
  risks: string[];
  evidence: string[];
  confidence: number;
  recommendedAction: string;
  blockers: string[];
  reusableLearning: string[];
}

export interface ExternalCodeCellAdapter {
  cellId: string;
  providerId: string;
  status: ExternalCodeCellStatus;
  capabilities: string[];
  healthEvidence: string[];
  execute(request: ExternalCodeCellRequest): Promise<ExternalCodeCellResult>;
}

/**
 * Deterministic gate: only an explicitly executable external cell may run.
 */
export class ExternalCodeCellRuntime {
  private readonly cells = new Map<string, ExternalCodeCellAdapter>();

  register(adapter: ExternalCodeCellAdapter): void {
    if (this.cells.has(adapter.cellId)) {
      throw new Error(`EXTERNAL_CODE_CELL_ALREADY_REGISTERED:${adapter.cellId}`);
    }
    this.cells.set(adapter.cellId, adapter);
  }

  async execute(
    request: ExternalCodeCellRequest,
  ): Promise<ExternalCodeCellResult> {
    const cell = this.cells.get(request.cellId);
    if (!cell) {
      return blocked(request, "EXTERNAL_CODE_CELL_NOT_REGISTERED");
    }
    if (cell.status !== "EXECUTABLE") {
      return blocked(request, `EXTERNAL_CODE_CELL_NOT_EXECUTABLE:${cell.status}`);
    }
    if (!request.traceId || !request.objective) {
      return blocked(request, "EXTERNAL_CODE_CELL_REQUEST_INVALID");
    }

    const result = await cell.execute(request);
    if (result.traceId !== request.traceId || result.cellId !== request.cellId) {
      return blocked(request, "EXTERNAL_CODE_CELL_RESULT_IDENTITY_MISMATCH");
    }
    if (!Array.isArray(result.evidence) || result.evidence.length === 0) {
      return blocked(request, "EXTERNAL_CODE_CELL_EVIDENCE_REQUIRED");
    }
    if (result.confidence < 0 || result.confidence > 1) {
      return blocked(request, "EXTERNAL_CODE_CELL_CONFIDENCE_INVALID");
    }
    return result;
  }
}

function blocked(
  request: ExternalCodeCellRequest,
  blocker: string,
): ExternalCodeCellResult {
  return {
    cellId: request.cellId,
    traceId: request.traceId,
    status: "BLOCKED",
    result: "",
    facts: [],
    inferences: [],
    assumptions: [],
    risks: [],
    evidence: [`BLOCKED:${blocker}`],
    confidence: 0,
    recommendedAction: "Resolve the blocker before execution.",
    blockers: [blocker],
    reusableLearning: [],
  };
}
