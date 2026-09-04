import type { ConchitaAuthenticatedPrincipal } from './conchita-authenticated-principal.js';
import type { ConchitaSessionRecord } from './conchita-cloud-session-store.js';

/** Minimal Cloudflare KV surface required by the cloud session boundary. */
export interface ConchitaKvNamespace {
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string, options?: { expiration?: number; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ConchitaDurableSessionRepository {
  get(sessionId: string): Promise<ConchitaSessionRecord | undefined>;
  save(session: ConchitaSessionRecord): Promise<void>;
  revoke(sessionId: string, revokedAt?: string): Promise<boolean>;
  isActive(sessionId: string, now?: Date): Promise<boolean>;
}

/**
 * Cloud persistence adapter for the existing Conchita session contract.
 *
 * It deliberately stays outside the in-memory pilot store: production cloud
 * state is asynchronous and must never be silently downgraded to process
 * memory. The adapter is fail-closed when the backing KV operation fails.
 */
export class ConchitaKvSessionRepository implements ConchitaDurableSessionRepository {
  constructor(private readonly kv: ConchitaKvNamespace, private readonly keyPrefix = 'conchita:session:') {}

  async get(sessionId: string): Promise<ConchitaSessionRecord | undefined> {
    const normalized = normalizeSessionId(sessionId);
    if (!normalized) return undefined;
    try {
      const record = await this.kv.get<ConchitaSessionRecord>(this.key(normalized), 'json');
      return record ? { ...record } : undefined;
    } catch {
      return undefined;
    }
  }

  async save(session: ConchitaSessionRecord): Promise<void> {
    const normalized = normalizeSessionId(session.sessionId);
    if (!normalized || !session.userId.trim()) throw new Error('INVALID_SESSION_RECORD');
    const ttl = session.expiresAt ? Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000) : undefined;
    if (ttl !== undefined && ttl <= 0) throw new Error('SESSION_ALREADY_EXPIRED');
    await this.kv.put(this.key(normalized), JSON.stringify(session), ttl ? { expirationTtl: ttl } : undefined);
  }

  async revoke(sessionId: string, revokedAt = new Date().toISOString()): Promise<boolean> {
    const normalized = normalizeSessionId(sessionId);
    if (!normalized) return false;
    const current = await this.get(normalized);
    if (!current) return false;
    await this.kv.put(this.key(normalized), JSON.stringify({ ...current, revokedAt }));
    return true;
  }

  async isActive(sessionId: string, now = new Date()): Promise<boolean> {
    const current = await this.get(sessionId);
    if (!current || current.revokedAt) return false;
    if (current.expiresAt && Date.parse(current.expiresAt) <= now.getTime()) return false;
    return true;
  }

  private key(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }
}

export class ConchitaKvSessionAuthenticator {
  constructor(private readonly sessions: ConchitaDurableSessionRepository) {}

  async authenticate(sessionId: string): Promise<ConchitaAuthenticatedPrincipal | null> {
    const normalized = normalizeSessionId(sessionId);
    if (!normalized || !(await this.sessions.isActive(normalized))) return null;
    const session = await this.sessions.get(normalized);
    if (!session) return null;
    return { userId: session.userId, authenticationMethod: 'CLOUD_SESSION' };
  }
}

function normalizeSessionId(value: string): string {
  return value.trim();
}
