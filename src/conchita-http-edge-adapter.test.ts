import { describe, expect, it, vi } from 'vitest';
import { createConchitaHttpEdgeHandler } from './conchita-http-edge-adapter.js';

describe('Conchita HTTP edge adapter', () => {
  const gate = { handle: vi.fn(async (request) => ({ accepted: true, response: {
    sessionId: request.sessionId,
    clientRequestId: request.clientRequestId,
    traceId: 'trace-1',
    status: 'COMPLETED' as const,
    response: 'ok',
    evidence: ['EDGE_TEST'],
    blockers: [],
  }})) };

  const handler = createConchitaHttpEdgeHandler({ gate }, { allowedOrigins: ['https://conchita.example'] });

  it('delegates only validated JSON POST requests', async () => {
    const response = await handler(new Request('https://api.example/conchita/v1/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://conchita.example' },
      body: JSON.stringify({ sessionId: 's1', message: 'hola', clientRequestId: 'r1', mode: 'PERSONAL' }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'COMPLETED', response: 'ok' });
    expect(gate.handle).toHaveBeenCalledTimes(1);
  });

  it('rejects unapproved origins before the gate', async () => {
    gate.handle.mockClear();
    const response = await handler(new Request('https://api.example/conchita/v1/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ sessionId: 's1', message: 'hola', clientRequestId: 'r1' }),
    }));
    expect(response.status).toBe(403);
    expect(gate.handle).not.toHaveBeenCalled();
  });

  it('rejects oversized payloads before the gate', async () => {
    gate.handle.mockClear();
    const response = await createConchitaHttpEdgeHandler({ gate }, { allowedOrigins: [] }, { maxBodyBytes: 10 })(
      new Request('https://api.example/conchita/v1/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 's1', message: 'hola', clientRequestId: 'r1' }),
      }),
    );
    expect(response.status).toBe(413);
    expect(gate.handle).not.toHaveBeenCalled();
  });

  it('rejects malformed transport without invoking runtime', async () => {
    gate.handle.mockClear();
    const response = await handler(new Request('https://api.example/conchita/v1/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hola' }),
    }));
    expect(response.status).toBe(400);
    expect(gate.handle).not.toHaveBeenCalled();
  });
});
