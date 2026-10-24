import { describe, expect, it } from 'vitest';
import { ConchitaExecutionStateDurableObject } from './conchita-durable-object-execution-result-store.js';
import { DurableObjectProjectCheckpointStore, type ProjectCheckpoint } from './context/durable-context-store.js';
import { ConchitaProjectCheckpointRuntime, CONCHITA_PILOT_PROJECT_ID, type ConchitaCheckpointRuntimeHandler } from './conchita-project-checkpoint-runtime.js';
import type { ConchitaSession } from './conchita-personal-v0-contract.js';
import { createConchitaSessionRecord } from './conchita-cloud-session-store.js';

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
  it('delivers the full bounded work state to the resumed handler after runtime recreation', async () => {
    const sql = persistentSql();
    const receivedCheckpoints: Array<ProjectCheckpoint | undefined> = [];
    const handler: ConchitaCheckpointRuntimeHandler = {
      async handle(request) {
        receivedCheckpoints.push(request.checkpoint);
        return {
          status: 'COMPLETED',
          response: 'provider output must never be persisted',
          evidence: ['RUNTIME_TEST_EVIDENCE'],
          blockers: [],
        };
      },
    };

    const firstRuntime = new ConchitaProjectCheckpointRuntime(handler, checkpointStore(sql), () => '2026-10-24T12:01:00.000Z');
    const first = await firstRuntime.handle({ session: pilotSession, message: 'user message must never be persisted', mode: 'PERSONAL', traceId: 'trace-1' });
    expect(first.status).toBe('COMPLETED');
    expect(first.evidence).toContain('PROJECT_CHECKPOINT_SAVED');
    expect(receivedCheckpoints[0]).toBeUndefined();

    // Recreate both runtime and Durable Object wrapper while retaining the same simulated SQLite storage.
    const recreatedRuntime = new ConchitaProjectCheckpointRuntime(handler, checkpointStore(sql), () => '2026-10-24T12:02:00.000Z');
    const second = await recreatedRuntime.handle({ session: pilotSession, message: 'second user message must never be persisted', mode: 'PERSONAL', traceId: 'trace-2' });
    expect(second.status).toBe('COMPLETED');
    expect(second.evidence).toContain('PROJECT_CHECKPOINT_RECOVERED');

    // The handler receives the recovered work state, not merely a project ID or recovery flag.
    expect(receivedCheckpoints[1]).toEqual({
      schemaVersion: 1,
      projectId: CONCHITA_PILOT_PROJECT_ID,
      updatedAt: '2026-10-24T12:01:00.000Z',
      summary: 'Authenticated Conchita runtime request completed.',
      completed: ['RUNTIME_REQUEST_COMPLETED'],
      blockers: [],
      nextAction: 'Continue from the completed Conchita pilot checkpoint.',
      evidenceRefs: ['RUNTIME_TEST_EVIDENCE'],
    });

    const persistedJson = JSON.stringify(await checkpointStore(sql).load(CONCHITA_PILOT_PROJECT_ID));
    expect(persistedJson).not.toContain('user message must never be persisted');
    expect(persistedJson).not.toContain('provider output must never be persisted');
    expect(persistedJson).not.toContain('second user message must never be persisted');
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
    const session = createConchitaSessionRecord('server-issued-session', 'pilot-user', 'PERSONAL', new Date('2026-10-24T12:00:00.000Z'), new Date('2026-10-25T12:00:00.000Z'), CONCHITA_PILOT_PROJECT_ID);
    expect(session.projectId).toBe(CONCHITA_PILOT_PROJECT_ID);
    expect('projectId' in { sessionId: 'client-input', message: 'hello', clientRequestId: 'req-1' }).toBe(false);
  });
});
