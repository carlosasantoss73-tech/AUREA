import { describe, expect, it } from 'vitest';
import { ConchitaExecutionStateDurableObject, ConchitaDurableObjectExecutionResultStore } from './conchita-durable-object-execution-result-store.js';

function fakeSql() {
  const results = new Map<string, string>();
  const reservations = new Set<string>();
  return {
    exec(sql: string, ...bindings: unknown[]) {
      const traceId = String(bindings[0] ?? '');
      if (sql.startsWith('CREATE TABLE')) return { toArray: <T>() => [] as T[] };
      if (sql.includes('SELECT result_json')) return { toArray: <T>() => [...results.values()].map(result_json => ({ result_json }) as T) };
      if (sql.includes('SELECT trace_id FROM execution_results')) return { toArray: <T>() => results.has(traceId) ? [{ trace_id: traceId } as T] : [] };
      if (sql.includes('SELECT trace_id FROM execution_reservations')) return { toArray: <T>() => reservations.has(traceId) ? [{ trace_id: traceId } as T] : [] };
      if (sql.startsWith('INSERT INTO execution_reservations')) { reservations.add(traceId); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('INSERT OR REPLACE INTO execution_results')) { results.set(traceId, String(bindings[1])); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('DELETE FROM execution_reservations')) { reservations.delete(traceId); return { toArray: <T>() => [] as T[] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

function createStore() {
  const sql = fakeSql();
  const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
  const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
  return new ConchitaDurableObjectExecutionResultStore(stub);
}

describe('Conchita durable execution state', () => {
  it('returns RESERVED once and COMPLETED after commit', async () => {
    const store = createStore();
    expect(await store.reserve('trace-1')).toBe('RESERVED');
    expect(await store.reserve('trace-1')).toBe('BLOCKED');
    await store.commitCompleted({ traceId: 'trace-1', status: 'SUCCEEDED', output: 'ok', evidence: ['test'] } as any);
    expect(await store.reserve('trace-1')).toBe('COMPLETED');
    expect((await store.loadState()).completed[0]?.traceId).toBe('trace-1');
  });

  it('allows only one concurrent reservation for the same trace', async () => {
    const store = createStore();
    const reservations = await Promise.all(
      Array.from({ length: 16 }, () => store.reserve('trace-concurrent')),
    );
    expect(reservations.filter(status => status === 'RESERVED')).toHaveLength(1);
    expect(reservations.filter(status => status === 'BLOCKED')).toHaveLength(15);
    expect(new Set(reservations)).toEqual(new Set(['RESERVED', 'BLOCKED']));
  });
});
