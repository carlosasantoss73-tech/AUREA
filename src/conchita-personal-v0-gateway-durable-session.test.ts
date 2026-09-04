import { describe, expect, it } from 'vitest';
import { ConchitaPersonalV0Gateway } from './conchita-personal-v0-gateway.js';
import { ConchitaKvSessionRepository, type ConchitaKvNamespace } from './conchita-cloud-kv-session-store.js';
import { createConchitaSessionRecord } from './conchita-cloud-session-store.js';

class FakeKv implements ConchitaKvNamespace {
  private readonly values = new Map<string, string>();

  async get<T>(key: string, _type: 'json'): Promise<T | null> {
    const value = this.values.get(key);
    return value ? JSON.parse(value) as T : null;
  }

  async put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe('ConchitaPersonalV0Gateway with durable session backend', () => {
  it('uses the persisted session for authenticated message authorization', async () => {
    const repository = new ConchitaKvSessionRepository(new FakeKv());
    const session = createConchitaSessionRecord('sess-durable', 'user-durable');
    await repository.save(session);

    const gateway = new ConchitaPersonalV0Gateway(
      {
        async handle({ message }) {
          return { status: 'COMPLETED', response: `echo:${message}`, evidence: ['TEST_HANDLER'], blockers: [] };
        },
      },
      repository,
      () => '2026-09-04T22:00:00Z',
      () => 'trace-durable',
    );

    const response = await gateway.sendAuthenticatedMessage(
      { userId: 'user-durable', authenticationMethod: 'CLOUD_SESSION' },
      {
        sessionId: 'sess-durable',
        userId: 'user-durable',
        message: 'hola',
        clientRequestId: 'client-1',
      },
    );

    expect(response.status).toBe('COMPLETED');
    expect(response.response).toBe('echo:hola');
    expect(response.traceId).toBe('trace-durable');
  });

  it('blocks when the durable session is revoked', async () => {
    const repository = new ConchitaKvSessionRepository(new FakeKv());
    await repository.save(createConchitaSessionRecord('sess-revoked', 'user-1'));
    await repository.revoke('sess-revoked', '2026-09-04T22:00:00Z');

    let handlerCalled = false;
    const gateway = new ConchitaPersonalV0Gateway(
      {
        async handle() {
          handlerCalled = true;
          return { status: 'COMPLETED', response: 'should-not-run', evidence: [], blockers: [] };
        },
      },
      repository,
    );

    const response = await gateway.sendAuthenticatedMessage(
      { userId: 'user-1', authenticationMethod: 'CLOUD_SESSION' },
      { sessionId: 'sess-revoked', userId: 'user-1', message: 'hola', clientRequestId: 'client-2' },
    );

    expect(response.status).toBe('BLOCKED');
    expect(response.blockers).toContain('SESSION_NOT_ACTIVE');
    expect(handlerCalled).toBe(false);
  });
});
