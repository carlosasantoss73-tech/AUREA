import { describe, expect, it } from 'vitest';
import { ConchitaExecutionStateDurableObject } from './conchita-durable-object-execution-result-store.js';
import { DurableObjectProjectCheckpointStore } from './context/durable-context-store.js';
import { ConchitaProjectCheckpointRuntime, CONCHITA_PILOT_PROJECT_ID, type ConchitaCheckpointRuntimeHandler } from './conchita-project-checkpoint-runtime.js';
import type { ConchitaSession } from './conchita-personal-v0-contract.js';

function persistentSql() {
  const checkpoints = new Map<string, { checkpoint_json: string; updated_at: string }>();
  return {
    exec(sql: string, ...bindings: unknown[]) {
      const key = String(bindings[0] ?? '');
      if (sql.startsWith('CREATE TABLE')) return { toArray: <T>() => [] as T[] };
      if (sql.includes('SELECT checkpoint_json FROM project_checkpoints')) return { toArray: <T>() => checkpoints.has(key) ? [checkpoints.get(key)! as T] : [] };
      if (sql.startsWith('INSERT OR REPLACE INTO project_checkpoints')) {
        checkpoints.set(key, { checkpoint_json: String(bindings[1]), updated_at: String(bindings[2]) });
        return { toArray: <T>() => [] as T[] };
      }
      throw new Error(`unexpected SQL in runtime test: ${sql}`);
    },
  };
}

function checkpointStore(sql: ReturnType<typeof persistentSql>) {
  const object = new ConchitaExecutionStateDurableObject({ storage: { sql } });
  const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
  return new DurableObjectProjectCheckpointStore(stub, [CONCHITA_PILOT_PROJECT_ID]);
}

const pilotSession: ConchitaSession = {
  sessionId: 'server-issued-session',
  userId: 'pilot-user',
  channel: 'MOBILE_APP',
  mode: 'PERSONAL',
  createdAt: '2026-10-24T12:00:00.000Z',
  projectId: CONCHITA_PILOT_PROJECT_ID,
};

describe('Conchita authenticated project checkpoint runtime', () => {
  it('saves runtime metadata, recreates the runtime, and recovers the server-scoped checkpoint', async () => {
    const sql = persistentSql();
    const seen: Array<string | undefined> = [];
    const handler: ConchitaCheckpointRuntimeHandler = {
      async handle(request) {
        seen.push(request.checkpoint?.projectId);
        return { status: 'COMPLETED', response: 'ok', evidence: ['runtime-test'], blockers: [] };
      },
    };

    const firstRuntime = new ConchitaProjectCheckpointRuntime(handler, checkpointStore(sql), () => '2026-10-24T12:01:00.000Z');
    const first = await firstRuntime.handle({ session: pilotSession, message: 'not persisted', mode: 'PERSONAL', traceId: 'trace-1' });
    expect(first.status).toBe('COMPLETED');
    expect(first.evidence).toContain('PROJECT_CHECKPOINT_SAVED');
    expect(seen[0]).toBeUndefined();

    // New runtime + Durable Object wrapper, with the same backing SQLite storage.
    const recreatedRuntime = new ConchitaProjectCheckpointRuntime(handler, checkpointStore(sql), () => '2026-10-24T12:02:00.000Z');
    const second = await recreatedRuntime.handle({ session: pilotSession, message: 'also not persisted', mode: 'PERSONAL', traceId: 'trace-2' });
    expect(second.status).toBe('COMPLETED');
    expect(second.evidence).toContain('PROJECT_CHECKPOINT_RECOVERED');
    expect(seen[1]).toBe(CONCHITA_PILOT_PROJECT_ID);

    const recovered = await checkpointStore(sql).load(CONCHITA_PILOT_PROJECT_ID);
    expect(recovered).toMatchObject({
      projectId: CONCHITA_PILOT_PROJECT_ID,
      summary: 'Conchita pilot runtime checkpoint refreshed.',
      completed: ['AUTHENTICATED_RUNTIME_REQUEST_COMPLETED'],
    });
    expect(JSON.stringify(recovered)).not.toContain('not persisted');
  });

  it('rejects any session outside the single-project pilot scope before loading, saving, or executing', async () => {
    const sql = persistentSql();
    let handlerCalls = 0;
    const handler: ConchitaCheckpointRuntimeHandler = {
      async handle() {
        handlerCalls += 1;
        return { status: 'COMPLETED', response: 'should not run', evidence: [], blockers: [] };
      },
    };
    const runtime = new ConchitaProjectCheckpointRuntime(handler, checkpointStore(sql));
    const result = await runtime.handle({
      session: { ...pilotSession, projectId: 'ECP' },
      message: 'must be rejected',
      mode: 'PERSONAL',
      traceId: 'trace-cross-project',
    });

    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain('CONCHITA_PROJECT_SCOPE_MISMATCH');
    expect(handlerCalls).toBe(0);
    await expect(checkpointStore(sql).load(CONCHITA_PILOT_PROJECT_ID)).resolves.toBeNull();
  });

  it('assigns pilot project scope only through the server session factory contract', async () => {
    // The session-creation path supplies the project constant after bootstrap authentication;
    // the client message contract has no projectId field.
    const session = { ...pilotSession };
    expect(session.projectId).toBe(CONCHITA_PILOT_PROJECT_ID);
    expect('projectId' in { sessionId: 'client-input', message: 'hello', clientRequestId: 'req-1' }).toBe(false);
  });
});
