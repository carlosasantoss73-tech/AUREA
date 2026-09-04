import type { ExecutionResultStore, ExecutionResultStoreState } from './execution-result-store.js';
import type { ExecutionRuntimeResult } from './execution-runtime.js';
import type { ConchitaKvNamespace } from './conchita-cloud-kv-session-store.js';

/** Cloudflare KV adapter for pilot execution idempotency/replay state. */
export class ConchitaKvExecutionResultStore implements ExecutionResultStore {
  constructor(private readonly kv: ConchitaKvNamespace, private readonly key = 'conchita:execution:state') {}

  async loadState(): Promise<ExecutionResultStoreState> {
    const state = await this.kv.get<ExecutionResultStoreState>(this.key, 'json');
    return state ?? { completed: [], reservedTraceIds: [] };
  }

  async reserve(traceId: string): Promise<'RESERVED' | 'COMPLETED'> {
    const state = await this.loadState();
    if (state.completed.some(result => result.traceId === traceId)) return 'COMPLETED';
    if (!state.reservedTraceIds.includes(traceId)) {
      await this.kv.put(this.key, JSON.stringify({ ...state, reservedTraceIds: [...state.reservedTraceIds, traceId] }));
    }
    return 'RESERVED';
  }

  async commitCompleted(result: ExecutionRuntimeResult): Promise<void> {
    const state = await this.loadState();
    const completed = state.completed.filter(item => item.traceId !== result.traceId);
    await this.kv.put(this.key, JSON.stringify({
      completed: [...completed, { ...result, evidence: [...result.evidence] }],
      reservedTraceIds: state.reservedTraceIds.filter(id => id !== result.traceId),
    }));
  }

  async releaseReservation(traceId: string): Promise<void> {
    const state = await this.loadState();
    await this.kv.put(this.key, JSON.stringify({
      ...state,
      reservedTraceIds: state.reservedTraceIds.filter(id => id !== traceId),
    }));
  }
}
