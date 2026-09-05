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
      if (sql.startsWith('SELECT trace_id FROM execution_reservations')) return { toArray: <T>() => [...reservations].map(id => ({ trace_id: id }) as T) };
      if (sql.startsWith('INSERT INTO execution_reservations')) { reservations.add(traceId); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('INSERT OR REPLACE INTO execution_results')) { results.set(traceId, String(bindings[1])); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('DELETE FROM execution_reservations')) { reservations.delete(traceId); return { toArray: <T>() => [] as T[] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

describe('Conchita durable execution state', () => {
  it('returns RESERVED once and COMPLETED after commit', async () => {
    const sql = fakeSql();
    const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
    const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
    const store = new ConchitaDurableObjectExecutionResultStore(stub);
    expect(await store.reserve('trace-1')).toBe('RESERVED');
    expect(await store.reserve('trace-1')).toBe('RESERVED');
    await store.commitCompleted({ traceId: 'trace-1', status: 'SUCCEEDED', output: 'ok', evidence: ['test'] } as any);
    expect(await store.reserve('trace-1')).toBe('COMPLETED');
    expect((await store.loadState()).completed[0]?.traceId).toBe('trace-1');
  });
});
