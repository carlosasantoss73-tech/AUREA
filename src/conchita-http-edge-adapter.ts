import type { ConchitaCloudMessageGate, ConchitaCloudMessageGateResult } from './conchita-cloud-message-gate.js';
import type { ConchitaPwaRequest } from './conchita-pwa-request.js';

export interface ConchitaHttpEdgeEnv {
  allowedOrigins: string[];
}

export interface ConchitaHttpEdgeDependencies {
  gate: Pick<ConchitaCloudMessageGate, 'handle'>;
}

export interface ConchitaHttpEdgeOptions {
  maxBodyBytes?: number;
}

const DEFAULT_MAX_BODY_BYTES = 16_384;

/**
 * Transport-only HTTP boundary for Conchita.
 * It deliberately does not authenticate by itself: authentication remains the
 * responsibility of ConchitaCloudMessageGate. This adapter only parses,
 * bounds, applies CORS, and delegates to the authoritative cloud gate.
 */
export function createConchitaHttpEdgeHandler(
  dependencies: ConchitaHttpEdgeDependencies,
  env: ConchitaHttpEdgeEnv,
  options: ConchitaHttpEdgeOptions = {},
): (request: Request) => Promise<Response> {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const corsOrigin = origin && env.allowedOrigins.includes(origin) ? origin : undefined;
    const corsHeaders: Record<string, string> = corsOrigin
      ? {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          Vary: 'Origin',
        }
      : {};

    if (request.method === 'OPTIONS') {
      if (origin && !corsOrigin) return json({ status: 'BLOCKED', error: 'ORIGIN_NOT_ALLOWED' }, 403);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (new URL(request.url).pathname !== '/conchita/v1/message') return json({ status: 'BLOCKED', error: 'NOT_FOUND' }, 404);
    if (request.method !== 'POST') return json({ status: 'BLOCKED', error: 'METHOD_NOT_ALLOWED' }, 405, corsHeaders);
    if (origin && !corsOrigin) return json({ status: 'BLOCKED', error: 'ORIGIN_NOT_ALLOWED' }, 403);

    const contentType = request.headers.get('Content-Type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) return json({ status: 'BLOCKED', error: 'JSON_REQUIRED' }, 415, corsHeaders);

    const body = await request.arrayBuffer();
    if (body.byteLength > maxBodyBytes) return json({ status: 'BLOCKED', error: 'REQUEST_TOO_LARGE' }, 413, corsHeaders);

    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return json({ status: 'BLOCKED', error: 'INVALID_JSON' }, 400, corsHeaders);
    }

    if (!isPwaRequest(payload)) return json({ status: 'BLOCKED', error: 'INVALID_TRANSPORT_REQUEST' }, 400, corsHeaders);

    try {
      const result = await dependencies.gate.handle(payload);
      return gateResponse(result, corsHeaders);
    } catch {
      return json({ status: 'BLOCKED', error: 'GATEWAY_FAILURE' }, 503, corsHeaders);
    }
  };
}

function isPwaRequest(value: unknown): value is ConchitaPwaRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sessionId === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.clientRequestId === 'string' &&
    (candidate.mode === undefined || candidate.mode === 'PERSONAL' || candidate.mode === 'XOLAR')
  );
}

function gateResponse(result: ConchitaCloudMessageGateResult, headers: Record<string, string>): Response {
  if (!result.accepted) return json({ status: 'BLOCKED', error: result.reason ?? 'REQUEST_BLOCKED' }, 401, headers);
  return json(result.response ?? { status: 'BLOCKED', error: 'EMPTY_GATE_RESPONSE' }, result.response?.status === 'COMPLETED' ? 200 : 403, headers);
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}
