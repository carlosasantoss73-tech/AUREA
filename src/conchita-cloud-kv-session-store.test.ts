import { describe, expect, it } from 'vitest';
import { ConchitaKvSessionAuthenticator, ConchitaKvSessionRepository, type ConchitaKvNamespace } from './conchita-cloud-kv-session-store.js';
import { createConchitaSessionRecord } from './conchita-cloud-session-store.js';

class FakeKv implements ConchitaKvNamespace {
  readonly values = new Map<string, string>();
  fail = false;

  async get<T>(key: string, _type: 'json'): Promise<T | null> {
    if (this.fail) throw new Error('KV_DOWN');
    const value = this.values.get(key);
    return value ? JSON.parse(value) as T : null;
  }

  async put(key: string, value: string): Promise<void> {
    if (this.fail) throw new Error('KV_DOWN');
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe('ConchitaKvSessionRepository', () => {
  it('persists and authenticates an active session', async () => {
    const kv = new FakeKv();
    const repository = new ConchitaKvSessionRepository(kv);
    const session = createConchitaSessionRecord('sess-1', 'user-1', 'PERSONAL', new Date(), new Date(Date.now() + 86_400_000));

    await repository.save(session);
    const authenticator = new ConchitaKvSessionAuthenticator(repository);

    await expect(repository.isActive('sess-1')).resolves.toBe(true);
    await expect(authenticator.authenticate('sess-1')).resolves.toEqual({ userId: 'user-1', authenticationMethod: 'CLOUD_SESSION' });
  });

  it('fails closed for expired and revoked sessions', async () => {
    const kv = new FakeKv();
    const repository = new ConchitaKvSessionRepository(kv);
    const expired = createConchitaSessionRecord('expired', 'user-1');
    kv.values.set('conchita:session:expired', JSON.stringify({ ...expired, expiresAt: '2026-01-01T00:00:00Z' }));
    await repository.save(createConchitaSessionRecord('revoked', 'user-2'));
    await repository.revoke('revoked', '2026-09-04T12:00:00Z');

    expect(await repository.isActive('expired', new Date('2026-09-04T00:00:00Z'))).toBe(false);
    expect(await repository.isActive('revoked', new Date('2026-09-04T12:01:00Z'))).toBe(false);
    await expect(new ConchitaKvSessionAuthenticator(repository).authenticate('expired')).resolves.toBeNull();
    await expect(new ConchitaKvSessionAuthenticator(repository).authenticate('revoked')).resolves.toBeNull();
  });

  it('fails closed when cloud persistence is unavailable', async () => {
    const kv = new FakeKv();
    const repository = new ConchitaKvSessionRepository(kv);
    await repository.save(createConchitaSessionRecord('sess-1', 'user-1'));
    kv.fail = true;

    await expect(repository.get('sess-1')).resolves.toBeUndefined();
    await expect(repository.isActive('sess-1')).resolves.toBe(false);
    await expect(new ConchitaKvSessionAuthenticator(repository).authenticate('sess-1')).resolves.toBeNull();
  });
});
