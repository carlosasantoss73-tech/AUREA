import { describe, expect, it, vi } from 'vitest';
import worker from './conchita-cloudflare-worker.js';

type Stored = Record<string, unknown>;
class FakeKv {
  private readonly data = new Map<string, string>();
  async get<T>(key: string, type: 'json'): Promise<T | null> {
    if (type !== 'json') throw new Error('JSON_ONLY');
    const value = this.data.get(key);
    return value ? JSON.parse(value) as T : null;
  }
  async put(key: string, value: string): Promise<void> { this.data.set(key, value); }
  async delete(key: string): Promise<void> { this.data.delete(key); }
}

function env(kv: FakeKv) {
  return {
    CONCHITA_SESSIONS: kv,
    CONCHITA_ANTHROPIC_MODEL: 'claude-sonnet-5',
    ANTHROPIC_API_KEY: 'test-secret',
    CONCHITA_PILOT_USER_ID: 'pilot-user',
    CONCHITA_PILOT_BOOTSTRAP_TOKEN: 'pilot-token',
    CONCHITA_ALLOWED_ORIGIN: 'https://pilot.example',
  } as any;
}

describe('Conchita Cloudflare pilot worker', () => {
  it('creates a durable pilot session without exposing the bootstrap token', async () => {
    const kv = new FakeKv();
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer pilot-token' },
    }), env(kv));
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; sessionId: string };
    expect(body.status).toBe('COMPLETED');
    expect(body.sessionId).toBeTruthy();
    expect(JSON.stringify(kv)).not.toContain('pilot-token');
  });

  it('runs phone-shaped message through gate, admission, provider and execution', async () => {
    const kv = new FakeKv();
    const sessionResponse = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer pilot-token' },
    }), env(kv));
    const session = await sessionResponse.json() as { sessionId: string };

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hola desde Claude' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/message', {
      method: 'POST', headers: { Origin: 'https://pilot.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, message: 'Hola', clientRequestId: crypto.randomUUID(), mode: 'PERSONAL' }),
    }), env(kv));

    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; response: string; evidence: string[] };
    expect(body.status).toBe('COMPLETED');
    expect(body.response).toBe('Hola desde Claude');
    expect(body.evidence).toContain('PROVIDER_HTTP:anthropic');
    vi.unstubAllGlobals();
  });

  it('fails closed when the bootstrap token is wrong', async () => {
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer wrong' },
    }), env(new FakeKv()));
    expect(response.status).toBe(401);
  });
});
