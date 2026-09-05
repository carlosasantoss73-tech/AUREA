import type { ExecutionResultStore, ExecutionResultStoreState, ExecutionReservationStatus } from './execution-result-store.js';
import type { ExecutionRuntimeResult } from './execution-runtime.js';

export interface ConchitaExecutionStateStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/** Transport adapter: the Durable Object serializes all state mutations for one trace namespace. */
export class ConchitaDurableObjectExecutionResultStore implements ExecutionResultStore {
  constructor(private readonly stub: ConchitaExecutionStateStub) {}

  private async call(operation: string, payload: unknown = {}): Promise<any> {
    const response = await this.stub.fetch('https://conchita-execution-state.internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, ...((payload ?? {}) as object) }),
    });
    if (!response.ok) throw new Error(`EXECUTION_STATE_DO_HTTP_${response.status}`);
    const body = await response.json() as { status: string; state?: ExecutionResultStoreState; reservation?: ExecutionReservationStatus };
    if (body.status !== 'OK') throw new Error('EXECUTION_STATE_DO_REJECTED');
    return body;
  }

  async loadState(): Promise<ExecutionResultStoreState> {
    const body = await this.call('loadState');
    return body.state ?? { completed: [], reservedTraceIds: [] };
  }

  async reserve(traceId: string): Promise<ExecutionReservationStatus> {
    const body = await this.call('reserve', { traceId });
    return body.reservation;
  }

  async commitCompleted(result: ExecutionRuntimeResult): Promise<void> {
    await this.call('commitCompleted', { result });
  }

  async releaseReservation(traceId: string): Promise<void> {
    await this.call('releaseReservation', { traceId });
  }
}

export interface ConchitaExecutionSqlStorage {
  exec(sql: string, ...bindings: unknown[]): { toArray<T>(): T[] };
}

export interface ConchitaExecutionDurableObjectState {
  storage: { sql: ConchitaExecutionSqlStorage };
}

/** SQLite-backed Durable Object. One instance is selected per execution-state namespace. */
export class ConchitaExecutionStateDurableObject {
  constructor(private readonly state: ConchitaExecutionDurableObjectState) {
    this.state.storage.sql.exec('CREATE TABLE IF NOT EXISTS execution_results (trace_id TEXT PRIMARY KEY, result_json TEXT NOT NULL)');
    this.state.storage.sql.exec('CREATE TABLE IF NOT EXISTS execution_reservations (trace_id TEXT PRIMARY KEY)');
  }

  private stateSnapshot(): ExecutionResultStoreState {
    const completed = this.state.storage.sql.exec('SELECT result_json FROM execution_results').toArray<{ result_json: string }>().map(row => JSON.parse(row.result_json) as ExecutionRuntimeResult);
    const reservedTraceIds = this.state.storage.sql.exec('SELECT trace_id FROM execution_reservations').toArray<{ trace_id: string }>().map(row => row.trace_id);
    return { completed, reservedTraceIds };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return Response.json({ status: 'BLOCKED', error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    try {
      const body = await request.json() as { operation?: string; traceId?: string; result?: ExecutionRuntimeResult };
      const sql = this.state.storage.sql;
      switch (body.operation) {
        case 'loadState': return Response.json({ status: 'OK', state: this.stateSnapshot() });
        case 'reserve': {
          if (!body.traceId) return Response.json({ status: 'BLOCKED', error: 'TRACE_ID_REQUIRED' }, { status: 400 });
          const completed = sql.exec('SELECT trace_id FROM execution_results WHERE trace_id = ?', body.traceId).toArray();
          if (completed.length > 0) return Response.json({ status: 'OK', reservation: 'COMPLETED' });
          const reserved = sql.exec('SELECT trace_id FROM execution_reservations WHERE trace_id = ?', body.traceId).toArray();
          if (reserved.length === 0) sql.exec('INSERT INTO execution_reservations (trace_id) VALUES (?)', body.traceId);
          return Response.json({ status: 'OK', reservation: 'RESERVED' });
        }
        case 'commitCompleted': {
          if (!body.result?.traceId) return Response.json({ status: 'BLOCKED', error: 'RESULT_REQUIRED' }, { status: 400 });
          sql.exec('INSERT OR REPLACE INTO execution_results (trace_id, result_json) VALUES (?, ?)', body.result.traceId, JSON.stringify({ ...body.result, evidence: [...body.result.evidence] }));
          sql.exec('DELETE FROM execution_reservations WHERE trace_id = ?', body.result.traceId);
          return Response.json({ status: 'OK' });
        }
        case 'releaseReservation': {
          if (!body.traceId) return Response.json({ status: 'BLOCKED', error: 'TRACE_ID_REQUIRED' }, { status: 400 });
          sql.exec('DELETE FROM execution_reservations WHERE trace_id = ?', body.traceId);
          return Response.json({ status: 'OK' });
        }
        default: return Response.json({ status: 'BLOCKED', error: 'OPERATION_NOT_SUPPORTED' }, { status: 400 });
      }
    } catch {
      return Response.json({ status: 'BLOCKED', error: 'EXECUTION_STATE_DO_FAILURE' }, { status: 503 });
    }
  }
}
