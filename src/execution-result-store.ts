/** Durable store contract for execution idempotency and recovery. */
import type { ExecutionRuntimeResult } from "./execution-runtime.js";

export interface ExecutionResultStore {
  loadCompleted(): Promise<ExecutionRuntimeResult[]>;
  saveCompleted(result: ExecutionRuntimeResult): Promise<void>;
}

/** Test/dev adapter; production adapters can persist the same contract durably. */
export class InMemoryExecutionResultStore implements ExecutionResultStore {
  private readonly results = new Map<string, ExecutionRuntimeResult>();

  async loadCompleted(): Promise<ExecutionRuntimeResult[]> {
    return [...this.results.values()].map(result => ({ ...result, evidence: [...result.evidence] }));
  }

  async saveCompleted(result: ExecutionRuntimeResult): Promise<void> {
    this.results.set(result.traceId, { ...result, evidence: [...result.evidence] });
  }
}
