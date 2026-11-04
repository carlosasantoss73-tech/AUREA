import { describe, expect, it, vi } from 'vitest';
import worker, { ConchitaExecutionStateDurableObject } from './conchita-cloudflare-worker.js';

class FailClosedKv {
  private readonly data = new Map<string, string>();
  async get<T>(key: string, type: 'json'): Promise<T | null> {
    if (type !== 'json') throw new Error('JSON_ONLY');
    const value = this.data.get(key);
    return value ? JSON.parse(value) as T : null;
  }
  async put(key: string, value: string): Promise<void> { this.data.set(key, value); }
  async delete(key: string): Promise<void> { this.data.delete(key); }
}

function executionState() {
  const results = new Map<string, string>();
  const reservations = new Set<string>();
  const object = new ConchitaExecutionStateDurableObject({ storage: { sql: {
    exec(sql: string, ...bindings: unknown[]) {
      const traceId = String(bindings[0] ?? '');
      if (sql.startsWith('CREATE TABLE')) return { toArray: <T>() => [] as T[] };
      if (sql.includes('SELECT result_json')) return { toArray: <T>() => [...results.values()].map(result_json => ({ result_json }) as T) };
      if (sql.includes('SELECT trace_id FROM execution_results')) return { toArray: <T>() => results.has(traceId) ? [{ trace_id: traceId } as T] : [] };
      if (sql.includes('SELECT trace_id FROM execution_reservations')) return { toArray: <T>() => reservations.has(traceId) ? [{ trace_id: traceId } as T] : [] };
      if (sql.startsWith('INSERT INTO execution_reservations')) { reservations.add(traceId); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('INSERT OR REPLACE INTO execution_results')) { results.set(traceId, String(bindings[1])); return { toArray: <T>() => [] as T[] }; }
      if (sql.startsWith('DELETE FROM execution_reservations')) { reservations.delete(traceId); return { toArray: <T>() => [] as T[] }; }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  } } });
  const stub = { fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(String(input), init)) };
  return { idFromName: (_name: string) => 'execution-state', get: (_id: unknown) => stub };
}

describe('Conchita historical-context fail-closed regression', () => {
  it('blocks historical retrieval without institutional context before any provider call', async () => {
    const kv = new FailClosedKv();
    const env = {
      CONCHITA_SESSIONS: kv,
      CONCHITA_EXECUTION_STATE: executionState(),
      CONCHITA_ANTHROPIC_MODEL: 'claude-sonnet-5',
      ANTHROPIC_API_KEY: 'test-secret',
      CONCHITA_PILOT_USER_ID: 'pilot-user',
      CONCHITA_PILOT_BOOTSTRAP_TOKEN: 'pilot-token',
      CONCHITA_ALLOWED_ORIGIN: 'https://pilot.example',
    } as any;

    const sessionResponse = await worker.fetch(new Request('https://worker.example/conchita/v1/session', {
      method: 'POST', headers: { Origin: 'https://pilot.example', Authorization: 'Bearer pilot-token' },
    }), env);
    expect(sessionResponse.status).toBe(200);
    const session = await sessionResponse.json() as { sessionId: string };

    const providerFetch = vi.fn(async () => new Response(JSON.stringify({
      content: [{ type: 'text', text: 'This must never be returned' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', providerFetch);
    try {
      const response = await worker.fetch(new Request('https://worker.example/conchita/v1/message', {
        method: 'POST',
        headers: { Origin: 'https://pilot.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          message: 'Recupera lo que hablamos ayer sobre el Bibliotecario',
          clientRequestId: crypto.randomUUID(),
          mode: 'PERSONAL',
        }),
      }), env);

      expect(response.status).toBe(403);
      const body = await response.json() as { status: string; response?: string; blockers?: string[]; evidence?: string[] };
      expect(body.status).toBe('BLOCKED');
      expect(body.response).toBeUndefined();
      expect(providerFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
