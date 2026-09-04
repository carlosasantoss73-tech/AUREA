import { describe, expect, it } from 'vitest';
import {
  InMemoryConchitaSessionStore,
  createConchitaSessionRecord,
} from './conchita-cloud-session-store.js';

describe('Conchita cloud session store', () => {
  it('creates an active server-side session', () => {
    const store = new InMemoryConchitaSessionStore();
    const session = createConchitaSessionRecord('s1', 'u1');
    store.save(session);

    expect(store.isActive('s1')).toBe(true);
    expect(store.get('s1')?.userId).toBe('u1');
  });

  it('rejects a revoked session', () => {
    const store = new InMemoryConchitaSessionStore();
    store.save(createConchitaSessionRecord('s1', 'u1'));

    expect(store.revoke('s1')).toBe(true);
    expect(store.isActive('s1')).toBe(false);
    expect(store.get('s1')?.revokedAt).toBeTruthy();
  });

  it('rejects an expired session deterministically', () => {
    const store = new InMemoryConchitaSessionStore();
    const now = new Date('2026-09-04T00:00:00.000Z');
    const expired = new Date('2026-09-03T23:59:59.000Z');
    store.save(createConchitaSessionRecord('s1', 'u1', 'PERSONAL', now, expired));

    expect(store.isActive('s1', now)).toBe(false);
  });

  it('does not mutate stored session through caller-owned object', () => {
    const store = new InMemoryConchitaSessionStore();
    const session = createConchitaSessionRecord('s1', 'u1');
    store.save(session);
    session.userId = 'attacker';

    expect(store.get('s1')?.userId).toBe('u1');
  });
});
