import { ConchitaAnthropicExecutionAdapter } from './conchita-anthropic-execution-adapter.js';
import { ConchitaCloudMessageGate } from './conchita-cloud-message-gate.js';
import { ConchitaKvExecutionResultStore } from './conchita-cloudflare-kv-execution-result-store.js';
import { ConchitaKvSessionAuthenticator, ConchitaKvSessionRepository, type ConchitaKvNamespace } from './conchita-cloud-kv-session-store.js';
import { ConchitaPersonalV0Gateway } from './conchita-personal-v0-gateway.js';
import { createConchitaHttpEdgeHandler } from './conchita-http-edge-adapter.js';
import { ConchitaRuntimeBridge } from './conchita-runtime-bridge.js';
import { AureaExecutionGate } from './execution-gate.js';
import { ExecutionRuntime } from './execution-runtime.js';
import { ProviderRuntime } from './provider-runtime.js';
import { RuntimeAdmission } from './runtime-admission.js';
import { AureaPlatformIntegration } from './aurea-platform-integration.js';
import { AureaSentinel } from './sentinel.js';
import { HealthLedger } from './health-ledger.js';
import { ContextRetrievalGate, type ContextProvider } from './context/context-retrieval-gate.js';
import { createConchitaSessionRecord } from './conchita-cloud-session-store.js';
import type { ConchitaMode, ConchitaSession } from './conchita-personal-v0-contract.js';

interface Env {
  CONCHITA_SESSIONS: ConchitaKvNamespace;
  CONCHITA_ANTHROPIC_MODEL: string;
  ANTHROPIC_API_KEY: string;
  CONCHITA_PILOT_USER_ID: string;
  CONCHITA_PILOT_BOOTSTRAP_TOKEN: string;
  CONCHITA_ALLOWED_ORIGIN: string;
}

const contextProvider: ContextProvider = {
  async retrieve(input) {
    return { query: input.query, projectId: input.projectId, citations: [], facts: [] };
  },
};

function cors(origin: string | null, allowed: string): Record<string, string> {
  if (!origin || origin !== allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function createConchitaMessageHandler(env: Env): (request: Request) => Promise<Response> {
  const sessions = new ConchitaKvSessionRepository(env.CONCHITA_SESSIONS);
  const authenticator = new ConchitaKvSessionAuthenticator(sessions);
  const providers = new ProviderRuntime();
  const providerId = 'anthropic';
  providers.register({
    providerId,
    modelId: env.CONCHITA_ANTHROPIC_MODEL,
    status: env.ANTHROPIC_API_KEY ? 'EXECUTABLE' : 'BLOCKED',
    capabilities: ['conchita.chat'],
    healthEvidence: ['CREDENTIALS:SECRET_BOUNDARY'],
  });

  const execution = new ExecutionRuntime(new ConchitaKvExecutionResultStore(env.CONCHITA_SESSIONS));
  if (env.ANTHROPIC_API_KEY) {
    execution.registerAdapter(new ConchitaAnthropicExecutionAdapter(providerId, { apiKey: env.ANTHROPIC_API_KEY }));
  }

  const sentinel = new AureaSentinel(new HealthLedger());
  const platform = new AureaPlatformIntegration();
  platform.register({
    manifest: {
      integrationId: 'conchita-cloudflare-edge',
      componentId: 'conchita-cloudflare-worker',
      version: '1',
      boundaries: ['OPERATIONS', 'EXECUTION', 'PERMISSION', 'WORK_CELL'],
      requiredCapabilities: ['conchita.chat'],
      requiredConfiguration: ['CONCHITA_SESSIONS', 'ANTHROPIC_API_KEY', 'CONCHITA_PILOT_USER_ID'],
      healthChecks: ['https', 'kv', 'provider'],
      rollbackPlan: 'Disable the Worker deployment and preserve KV state.',
    },
    inspect: () => ({
      integrationId: 'conchita-cloudflare-edge',
      status: env.ANTHROPIC_API_KEY && env.CONCHITA_PILOT_USER_ID ? 'HEALTHY' : 'BLOCKED',
      checkedAt: new Date().toISOString(),
      checks: { healthy: Boolean(env.ANTHROPIC_API_KEY && env.CONCHITA_PILOT_USER_ID) },
      evidence: ['CLOUDFLARE_WORKER', 'KV_SESSION_BOUNDARY', 'SECRET_PROVIDER_BOUNDARY'],
      blockers: env.ANTHROPIC_API_KEY && env.CONCHITA_PILOT_USER_ID ? [] : ['CLOUD_CONFIGURATION_INCOMPLETE'],
    }),
  });

  const admission = new RuntimeAdmission(
    platform,
    new ContextRetrievalGate(contextProvider),
    providers,
    new AureaExecutionGate(sentinel),
  );
  const admissionFactory = {
    build(request: { session: ConchitaSession; message: string; mode: ConchitaMode; traceId: string }) {
      return {
        traceId: request.traceId,
        integrationId: 'conchita-cloudflare-edge',
        workCell: {
          workCellId: `CONCHITA-${request.traceId}`,
          projectId: 'CONCHITA-PILOT',
          companyId: 'AUREA',
          objective: request.message,
          owner: request.session.userId,
          planner: 'conchita-cloud',
          agents: ['conchita'],
          dependencies: [],
          restrictions: ['NO_BROWSER_IDENTITY', 'NO_SECRET_DISCLOSURE'],
          state: 'READY' as const,
          deliverables: [], evidence: [], qaStatus: 'PENDING' as const, auditStatus: 'PENDING' as const,
        },
        contextQuery: request.message,
        actorId: request.session.userId,
        actorRole: 'USER',
        capabilityId: 'conchita.chat',
        toolId: 'conchita.message',
        action: 'respond_to_user',
        effectClass: 'EXTERNAL' as const,
        providerCapability: 'conchita.chat',
        allowedProjects: ['CONCHITA-PILOT'],
        allowedCapabilities: ['conchita.chat'],
        allowedTools: ['conchita.message'],
      };
    },
  };
  const bridge = new ConchitaRuntimeBridge(admission, providers, execution, admissionFactory);
  const gateway = new ConchitaPersonalV0Gateway(bridge, sessions);
  return createConchitaHttpEdgeHandler(
    { gate: new ConchitaCloudMessageGate(authenticator, gateway) },
    { allowedOrigins: [env.CONCHITA_ALLOWED_ORIGIN] },
  );
}

async function handleSession(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const headers = cors(origin, env.CONCHITA_ALLOWED_ORIGIN);
  if (request.method === 'OPTIONS') return new Response(null, { status: origin && !headers['Access-Control-Allow-Origin'] ? 403 : 204, headers });
  if (request.method !== 'POST') return json({ status: 'BLOCKED', error: 'METHOD_NOT_ALLOWED' }, 405, headers);
  if (origin && !headers['Access-Control-Allow-Origin']) return json({ status: 'BLOCKED', error: 'ORIGIN_NOT_ALLOWED' }, 403, headers);

  const authorization = request.headers.get('Authorization') ?? '';
  if (!env.CONCHITA_PILOT_BOOTSTRAP_TOKEN || authorization !== `Bearer ${env.CONCHITA_PILOT_BOOTSTRAP_TOKEN}`) {
    return json({ status: 'BLOCKED', error: 'BOOTSTRAP_AUTH_REQUIRED' }, 401, headers);
  }
  if (!env.CONCHITA_PILOT_USER_ID) return json({ status: 'BLOCKED', error: 'PILOT_USER_NOT_CONFIGURED' }, 503, headers);

  const sessions = new ConchitaKvSessionRepository(env.CONCHITA_SESSIONS);
  const session = createConchitaSessionRecord(
    crypto.randomUUID(),
    env.CONCHITA_PILOT_USER_ID,
    'PERSONAL',
    new Date(),
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await sessions.save(session);
  return json({ status: 'COMPLETED', sessionId: session.sessionId, expiresAt: session.expiresAt }, 200, headers);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ status: 'OK', service: 'conchita-cloudflare-worker' });
      if (url.pathname === '/conchita/v1/session') return handleSession(request, env);
      const messageHandler = createConchitaMessageHandler(env);
      return await messageHandler(request);
    } catch {
      return json({ status: 'BLOCKED', error: 'WORKER_CONFIGURATION_OR_RUNTIME_FAILURE' }, 503);
    }
  },
};
