/** Durable store contract for execution idempotency and recovery. */
import type { ExecutionRuntimeResult } from "./execution-runtime.js";

export type ExecutionReservationStatus = "RESERVED" | "COMPLETED" | "BLOCKED";

export interface ExecutionResultStoreState {
  completed: ExecutionRuntimeResult[];
  reservedTraceIds: string[];
}

export interface ExecutionResultStore {
  loadState(): Promise<ExecutionResultStoreState>;
  reserve(traceId: string): Promise<ExecutionReservationStatus>;
  commitCompleted(result: ExecutionRuntimeResult): Promise<void>;
  releaseReservation(traceId: string): Promise<void>;
}

/** Test/dev adapter; production adapters must persist the same semantics durably. */
export class InMemoryExecutionResultStore implements ExecutionResultStore {
  private readonly results = new Map<string, ExecutionRuntimeResult>();
  private readonly reservations = new Set<string>();

  async loadState(): Promise<ExecutionResultStoreState> {
    return {
      completed: [...this.results.values()].map(result => ({ ...result, evidence: [...result.evidence] })),
      reservedTraceIds: [...this.reservations],
    };
  }

  async reserve(traceId: string): Promise<ExecutionReservationStatus> {
    if (this.results.has(traceId)) return "COMPLETED";
    if (this.reservations.has(traceId)) return "BLOCKED";
    this.reservations.add(traceId);
    return "RESERVED";
  }

  async commitCompleted(result: ExecutionRuntimeResult): Promise<void> {
    this.results.set(result.traceId, { ...result, evidence: [...result.evidence] });
    this.reservations.delete(result.traceId);
  }

  async releaseReservation(traceId: string): Promise<void> {
    this.reservations.delete(traceId);
  }
}
