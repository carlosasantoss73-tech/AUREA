export type ExecutionStepKind = "AGENT" | "SKILL" | "TOOL" | "PROVIDER" | "VALIDATOR" | "ARTIFACT";

export interface ExecutionStep {
  id: string;
  kind: ExecutionStepKind;
  capabilityId: string;
  dependsOn?: string[];
  parallelSafe?: boolean;
  idempotencyKey?: string;
  input?: unknown;
}

export interface ExecutionPlan {
  planId: string;
  objective: string;
  steps: ExecutionStep[];
}

/** Pure planning contract. It does not execute tools and does not bypass AUREA security gates. */
export function validateExecutionPlan(plan: ExecutionPlan): void {
  if (!plan.planId.trim()) throw new Error("PLAN_ID_REQUIRED");
  if (!plan.objective.trim()) throw new Error("PLAN_OBJECTIVE_REQUIRED");
  const ids = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id.trim()) throw new Error("STEP_ID_REQUIRED");
    if (ids.has(step.id)) throw new Error(`DUPLICATE_STEP:${step.id}`);
    ids.add(step.id);
    if (!step.capabilityId.trim()) throw new Error(`STEP_CAPABILITY_REQUIRED:${step.id}`);
    if (step.parallelSafe && !step.idempotencyKey) throw new Error(`PARALLEL_STEP_REQUIRES_IDEMPOTENCY:${step.id}`);
  }
  for (const step of plan.steps) {
    for (const dependency of step.dependsOn ?? []) {
      if (!ids.has(dependency)) throw new Error(`UNKNOWN_DEPENDENCY:${step.id}:${dependency}`);
      if (dependency === step.id) throw new Error(`SELF_DEPENDENCY:${step.id}`);
    }
  }
}

export function getReadySteps(plan: ExecutionPlan, completed: ReadonlySet<string>): ExecutionStep[] {
  validateExecutionPlan(plan);
  return plan.steps.filter((step) =>
    !completed.has(step.id) && (step.dependsOn ?? []).every((dependency) => completed.has(dependency)),
  );
}
