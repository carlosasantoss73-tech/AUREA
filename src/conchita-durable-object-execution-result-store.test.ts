import { describe, expect, it } from 'vitest';
import { ConchitaExecutionStateDurableObject, ConchitaDurableObjectExecutionResultStore } from './conchita-durable-object-execution-result-store.js';
import { DurableObjectProjectCheckpointStore, type ProjectCheckpoint } from './context/durable-context-store.js';

function fakeSql() {
  const results = new Map<string, string>();
  const reservations = new Set<string>();
  const checkpoints = new Map<string, { checkpoint_json: string; updated_at: string }>();
  return {
    exec(sql: string, ...bindings: unknown[]) {
      const key = String(bindings[0] ?? '');
      if (sql.startsWith('CREATE TABLE')) return { toArray: <T>() => [] as T[] };
      if (sql.includes('SELECT result_json')) return { toArray: <T>() => [...results.values()].map(result_json => ({ result_json }) as T) };
      if (sql.includes('SELECT checkpoint_json FROM project_checkpoints')) return { toArray: <T>() => checkpoints.has(key) ? [checkpoints.get(key)! as T] : [] };
      if (sql.includes('SELECT trace_id FROM execution_results')) return { toArray: <T>() => results.has(key) ? [{ trace_id: key } as T] : [] };
      if (sql.includes('SELECT trace_id FROM execution_reservations')) return { toArray: <T>() => reservations.has(key) ? [{ trace_id: key } as T] : [] };
      if (sql.startsWith('INSERT INTO execution_reservations')) { reservations.add(key); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('INSERT OR REPLACE INTO execution_results')) { results.set(key, String(bindings[1])); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('INSERT OR REPLACE INTO project_checkpoints')) {
        checkpoints.set(key, { checkpoint_json: String(bindings[1]), updated_at: String(bindings[2]) });
        return { toArray: <T>() => [] as T[] };
      }
      if (sql.startsWith('DELETE FROM execution_reservations')) { reservations.delete(key); return { toArray: <T>() => [] as T[] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

function createExecutionStore(sql = fakeSql()) {
  const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
  const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
  return new ConchitaDurableObjectExecutionResultStore(stub);
}

function createCheckpointStore(sql: ReturnType<typeof fakeSql>, allowedProjects: string[] = ['aurea', 'ecp']) {
  const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
  const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
  return new DurableObjectProjectCheckpointStore(stub, allowedProjects);
}

function checkpoint(projectId: string, overrides: Partial<ProjectCheckpoint> = {}): ProjectCheckpoint {
  return {
    schemaVersion: 1,
    projectId,
    updatedAt: '2026-10-24T12:00:00.000Z',
    summary: 'Checkpoint compacto de continuidad; no contiene documentos institucionales.',
    completed: ['Adaptador sobre Durable Object existente'],
    blockers: ['Recuperación cloud live pendiente'],
    nextAction: 'Ejecutar la prueba de recuperación en el Worker desplegado',
    evidenceRefs: ['https://github.com/carlosasantoss73-tech/AUREA/actions'],
    ...overrides,
  };
}

describe('Conchita durable execution state', () => {
  it('returns RESERVED once and COMPLETED after commit', async () => {
    const store = createExecutionStore();
    expect(await store.reserve('trace-1')).toBe('RESERVED');
    expect(await store.reserve('trace-1')).toBe('BLOCKED');
    await store.commitCompleted({ traceId: 'trace-1', status: 'SUCCEEDED', output: 'ok', evidence: ['test'] } as any);
    expect(await store.reserve('trace-1')).toBe('COMPLETED');
    expect((await store.loadState()).completed[0]?.traceId).toBe('trace-1');
  });

  it('allows only one concurrent reservation for the same trace', async () => {
    const store = createExecutionStore();
    const reservations = await Promise.all(Array.from({ length: 16 }, () => store.reserve('trace-concurrent')));
    expect(reservations.filter(status => status === 'RESERVED')).toHaveLength(1);
    expect(reservations.filter(status => status === 'BLOCKED')).toHaveLength(15);
    expect(new Set(reservations)).toEqual(new Set(['RESERVED', 'BLOCKED']));
  });
});

describe('Project checkpoint persistence on existing Durable Object', () => {
  it('saves, recreates the Durable Object instance, and recovers the same checkpoint', async () => {
    const persistentSql = fakeSql();
    const original = checkpoint('aurea');
    await createCheckpointStore(persistentSql).save(original);

    // Simulate process/object recreation while preserving the Durable Object's persistent SQLite storage.
    const recreatedStore = createCheckpointStore(persistentSql);
    await expect(recreatedStore.load('aurea')).resolves.toEqual(original);
  });

  it('isolates project checkpoints and refuses project IDs outside the caller allow-list', async () => {
    const persistentSql = fakeSql();
    const store = createCheckpointStore(persistentSql);
    await store.save(checkpoint('aurea'));
    await store.save(checkpoint('ecp', { summary: 'Checkpoint independiente de ECP.' }));

    await expect(store.load('aurea')).resolves.toMatchObject({ projectId: 'aurea' });
    await expect(store.load('ecp')).resolves.toMatchObject({ projectId: 'ecp', summary: 'Checkpoint independiente de ECP.' });
    await expect(createCheckpointStore(persistentSql, ['aurea']).load('ecp')).rejects.toThrow('PROJECT_CHECKPOINT_PROJECT_NOT_ALLOWED');
  });

  it('rejects secret-like content and oversized or unrecognized checkpoint fields', async () => {
    const store = createCheckpointStore(fakeSql());
    await expect(store.save(checkpoint('aurea', { summary: 'Bearer abcdefghijklmnop' }))).rejects.toThrow('PROJECT_CHECKPOINT_SECRET_LIKE_CONTENT_REJECTED');
    await expect(store.save(checkpoint('aurea', { extra: 'not allowed' } as Partial<ProjectCheckpoint>))).rejects.toThrow('PROJECT_CHECKPOINT_UNKNOWN_FIELD');
    await expect(store.save(checkpoint('aurea', { summary: 'x'.repeat(801) }))).rejects.toThrow('PROJECT_CHECKPOINT_INVALID_FIELD:summary');
  });

  it('fails closed when the Durable Object is unavailable instead of returning an empty checkpoint', async () => {
    const unavailable = { fetch: async () => new Response('unavailable', { status: 503 }) };
    const store = new DurableObjectProjectCheckpointStore(unavailable, ['aurea']);
    await expect(store.load('aurea')).rejects.toThrow('PROJECT_CHECKPOINT_DO_HTTP_503');
  });

  it('rejects a checkpoint whose project ID does not match the requested storage key', async () => {
    const sql = fakeSql();
    const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
    const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
    const response = await stub.fetch('https://conchita-execution-state.internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'saveCheckpoint', projectId: 'ecp', checkpoint: checkpoint('aurea') }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ status: 'BLOCKED', error: 'PROJECT_CHECKPOINT_PROJECT_MISMATCH' });
  });
});
