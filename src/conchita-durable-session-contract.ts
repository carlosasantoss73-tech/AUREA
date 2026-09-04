import type { ConchitaMode } from './conchita-personal-v0-contract.js';

export interface DurableConchitaSession {
  sessionId: string;
  userId: string;
  mode: ConchitaMode;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface ConchitaDurableSessionRepository {
  create(session: DurableConchitaSession): Promise<void>;
  get(sessionId: string): Promise<DurableConchitaSession | undefined>;
  revoke(sessionId: string, revokedAt: string): Promise<boolean>;
}

export function isDurableSessionActive(session: DurableConchitaSession, now = new Date()): boolean {
  if (session.revokedAt) return false;
  return new Date(session.expiresAt).getTime() > now.getTime();
}

export function assertDurableSession(session: DurableConchitaSession | undefined, now = new Date()): DurableConchitaSession {
  if (!session || !isDurableSessionActive(session, now)) throw new Error('SESSION_NOT_ACTIVE');
  return session;
}
