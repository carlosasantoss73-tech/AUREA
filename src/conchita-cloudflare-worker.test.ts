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
  dump(): Record<string, string> { return Object.fromEntries(this.data.entries()); }
}

function executionState() {
  const completed = new Map<string, Stored>();
  const reserved = new Set<string>();
  return {
    idFromName: (_name: string) => 'execution-state',
    get: (_id: unknown) => ({
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { operation?: string; traceId?: string; result?: Stored };
        if (body.operation === 'loadState') return Response.json({ status: 'OK', state: { completed: [...completed.values()], reservedTraceIds: [...reserved] } });
        if (body.operation === 'reserve' && body.traceId) {
          if (completed.has(body.traceId)) return Response.json({ status: 'OK', reservation: 'COMPLETED' });
          if (reserved.has(body.traceId)) return Response.json({ status: 'OK', reservation: 'BLOCKED' });
          reserved.add(body.traceId);
          return Response.json({ status: 'OK', reservation: 'RESERVED' });
        }
        if (body.operation === 'commitCompleted' && body.result?.traceId) {
          completed.set(body.result.traceId, body.result);
          reserved.delete(body.result.traceId);
          return Response.json({ status: 'OK' });
        }
        if (body.operation === 'releaseReservation' && body.traceId) {
          reserved.delete(body.traceId);
          return Response.json({ status: 'OK' });
        }
        return Response.json({ status: 'BLOCKED' }, { status: 400 });
      },
    }),
  };
}

function env(kv: FakeKv) {
  return {
    CONCHITA_SESSIONS: kv,
    CONCHITA_EXECUTION_STATE: executionState(),
    CONCHITA_ANTHROPIC_MODEL: 'claude-sonnet-5',
    ANTHROPIC_API_KEY: 'test-secret',
    CONCHITA_PILOT_USER_ID: 'pilot-user',
    CONCHITA_PILOT_BOOTSTRAP_TOKEN: 'pilot-token',
    CONCHITA_ALLOWED_ORIGIN: 'https://pilot.example',
  } as any;
}

describe('Conchita Cloudflare pilot worker', () => {
  it('reports blocked health when required runtime configuration is missing', async () => {
    const response = await worker.fetch(new Request('https://worker.example/health'), {
      ...env(new FakeKv()),
      ANTHROPIC_API_KEY: '',
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ status: 'BLOCKED' });
  });

  it('creates a durable pilot session without exposing the bootstrap token', async () => {
    const kv = new FakeKv();
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer pilot-token' },
    }), env(kv));
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; sessionId: string };
    expect(body.status).toBe('COMPLETED');
    expect(body.sessionId).toBeTruthy();
    expect(JSON.stringify(kv.dump())).not.toContain('pilot-token');
  });

  it('runs phone-shaped message through gate, admission, provider and execution', async () => {
    const kv = new FakeKv();
    const sessionResponse = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer pilot-token' },
    }), env(kv));
    const session = await sessionResponse.json() as { sessionId: string };

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hola desde Claude' }] }), { status: 200, headers: { 'Content-Type': 'application/json', 'request-id': 'req_test_123' } })));
    const clientRequestId = crypto.randomUUID();
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/message', {
      method: 'POST', headers: { Origin: 'https://pilot.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, message: 'Hola', clientRequestId, mode: 'PERSONAL' }),
    }), env(kv));

    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; response: string; evidence: string[]; traceId: string };
    expect(body.status).toBe('COMPLETED');
    expect(body.response).toBe('Hola desde Claude');
    expect(body.evidence).toContain('PROVIDER_HTTP:anthropic');
    expect(body.evidence).toContain('PROVIDER_REQUEST_ID:req_test_123');

    const second = await worker.fetch(new Request('https://worker.example/conchita/v1/message', {
      method: 'POST', headers: { Origin: 'https://pilot.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, message: 'Hola', clientRequestId, mode: 'PERSONAL' }),
    }), env(kv));
    const replay = await second.json() as { status: string; traceId: string; response: string; evidence: string[] };
    expect(second.status).toBe(200);
    expect(replay.status).toBe('COMPLETED');
    expect(replay.traceId).toBe(body.traceId);
    expect(replay.response).toBe('Hola desde Claude');
    expect(replay.evidence).toContain(`IDEMPOTENT_REPLAY:${body.traceId}`);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('fails closed when the bootstrap token is wrong', async () => {
    const response = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer wrong' },
    }), env(new FakeKv()));
    expect(response.status).toBe(401);
  });
});
