import { describe, expect, it, vi } from 'vitest';
import { ConchitaPersonalV0Gateway } from './conchita-personal-v0-gateway.js';
import { InMemoryConchitaSessionStore, createConchitaSessionRecord } from './conchita-cloud-session-store.js';

describe('Conchita gateway security boundary', () => {
  function setup() {
    const store = new InMemoryConchitaSessionStore();
    store.save(createConchitaSessionRecord('s1', 'u1'));
    const handler = { handle: vi.fn(async () => ({ status: 'COMPLETED' as const, response: 'ok', evidence: ['E1'], blockers: [] })) };
    const gateway = new ConchitaPersonalV0Gateway(handler, store, () => '2026-09-04T00:00:00.000Z', () => 'trace-1');
    return { store, handler, gateway };
  }

  it('blocks a request without an authenticated principal before runtime', async () => {
    const { gateway, handler } = setup();
    const result = await gateway.sendAuthenticatedMessage(undefined, {
      sessionId: 's1', userId: 'u1', message: 'hello', clientRequestId: 'c1',
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain('AUTHENTICATED_PRINCIPAL_REQUIRED');
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('blocks caller-supplied identity that differs from authenticated principal', async () => {
    const { gateway, handler } = setup();
    const result = await gateway.sendAuthenticatedMessage(
      { userId: 'attacker', authenticationMethod: 'COOKIE_SESSION' },
      { sessionId: 's1', userId: 'u1', message: 'hello', clientRequestId: 'c1' },
    );
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain('SESSION_PRINCIPAL_MISMATCH');
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('uses the injected server session store and accepts the bound principal', async () => {
    const { gateway, handler } = setup();
    const result = await gateway.sendAuthenticatedMessage(
      { userId: 'u1', authenticationMethod: 'COOKIE_SESSION' },
      { sessionId: 's1', userId: 'u1', message: 'hello', clientRequestId: 'c1' },
    );
    expect(result.status).toBe('COMPLETED');
    expect(result.response).toBe('ok');
    expect(handler.handle).toHaveBeenCalledOnce();
  });

  it('blocks revoked sessions', async () => {
    const { gateway, store, handler } = setup();
    store.revoke('s1', '2026-09-04T00:00:00.000Z');
    const result = await gateway.sendAuthenticatedMessage(
      { userId: 'u1', authenticationMethod: 'COOKIE_SESSION' },
      { sessionId: 's1', userId: 'u1', message: 'hello', clientRequestId: 'c1' },
    );
    expect(result.status).toBe('BLOCKED');
    expect(result.blockers).toContain('SESSION_NOT_ACTIVE');
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
