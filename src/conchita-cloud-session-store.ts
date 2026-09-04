import type { ConchitaMode, ConchitaSession } from './conchita-personal-v0-contract.js';

export interface ConchitaSessionRecord extends ConchitaSession {
  revokedAt?: string;
  expiresAt?: string;
}

export interface ConchitaSessionStore {
  get(sessionId: string): ConchitaSessionRecord | undefined;
  save(session: ConchitaSessionRecord): void;
  revoke(sessionId: string, revokedAt?: string): boolean;
  isActive(sessionId: string, now?: Date): boolean;
}

export class InMemoryConchitaSessionStore implements ConchitaSessionStore {
  private readonly sessions = new Map<string, ConchitaSessionRecord>();

  get(sessionId: string): ConchitaSessionRecord | undefined {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : undefined;
  }

  save(session: ConchitaSessionRecord): void {
    this.sessions.set(session.sessionId, { ...session });
  }

  revoke(sessionId: string, revokedAt = new Date().toISOString()): boolean {
    const current = this.sessions.get(sessionId);
    if (!current) return false;
    this.sessions.set(sessionId, { ...current, revokedAt });
    return true;
  }

  isActive(sessionId: string, now = new Date()): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) return false;
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= now.getTime()) return false;
    return true;
  }
}

export function createConchitaSessionRecord(
  sessionId: string,
  userId: string,
  mode: ConchitaMode = 'PERSONAL',
  now = new Date(),
  expiresAt?: Date,
): ConchitaSessionRecord {
  return {
    sessionId,
    userId,
    channel: 'MOBILE_APP',
    mode,
    createdAt: now.toISOString(),
    ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
  };
}
