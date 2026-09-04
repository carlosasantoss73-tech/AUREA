import { describe, expect, it } from 'vitest';
import {
  assertDurableSession,
  isDurableSessionActive,
  type DurableConchitaSession,
} from './conchita-durable-session-contract.js';

const base: DurableConchitaSession = {
  sessionId: 'sess-1', userId: 'user-1', mode: 'PERSONAL',
  createdAt: '2026-09-04T00:00:00.000Z', expiresAt: '2026-09-05T00:00:00.000Z',
};

const now = new Date('2026-09-04T12:00:00.000Z');

describe('durable Conchita session contract', () => {
  it('accepts an unrevoked session before expiry', () => {
    expect(isDurableSessionActive(base, now)).toBe(true);
    expect(assertDurableSession(base, now)).toEqual(base);
  });

  it('rejects an expired session', () => {
    const expired = { ...base, expiresAt: '2026-09-04T11:59:59.999Z' };
    expect(isDurableSessionActive(expired, now)).toBe(false);
    expect(() => assertDurableSession(expired, now)).toThrow('SESSION_NOT_ACTIVE');
  });

  it('rejects a revoked session even before expiry', () => {
    const revoked = { ...base, revokedAt: '2026-09-04T10:00:00.000Z' };
    expect(isDurableSessionActive(revoked, now)).toBe(false);
    expect(() => assertDurableSession(revoked, now)).toThrow('SESSION_NOT_ACTIVE');
  });

  it('rejects an absent session', () => {
    expect(() => assertDurableSession(undefined, now)).toThrow('SESSION_NOT_ACTIVE');
  });
});
