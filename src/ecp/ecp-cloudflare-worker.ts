import { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import { createGoogleDriveInstitutionalContextProvider } from "../context/google-drive-institutional-context-provider.js";
import { GoogleDriveInstitutionalReader } from "../context/google-drive-institutional-reader.js";
import { createEcpExpedientHttpHandler } from "./expedient-http-api.js";
import { EcpDurableObjectExpedientStore, EcpExpedientStateDurableObject, type DurableObjectNamespaceBinding } from "./expedient-store.js";
import { verifyCloudflareAccessJwt } from "./cloudflare-access-auth.js";
import { ECP_PILOT_HTML } from "./pilot-ui.js";
import { ConchitaAnthropicExecutionAdapter } from "../conchita-anthropic-execution-adapter.js";
import { ConchitaDurableObjectExecutionResultStore, ConchitaExecutionStateDurableObject, type ConchitaExecutionStateStub } from "../conchita-durable-object-execution-result-store.js";
import { executeEcpExpedientAnalysis } from "./expedient-analysis-runtime.js";

interface Env {
  ECP_EXPEDIENT_STATE: DurableObjectNamespaceBinding;
  ECP_EXECUTION_STATE: { idFromName(name: string): unknown; get(id: unknown): ConchitaExecutionStateStub };
  ANTHROPIC_API_KEY: string;
  ECP_ANTHROPIC_MODEL: string;
  ECP_ACCESS_TEAM_DOMAIN: string;
  ECP_ACCESS_AUD: string;
  ECP_ACCESS_ACTOR_ROLE: string;
  ECP_INSTITUTIONAL_INDEX_FILE_ID: string;
  ECP_GOOGLE_DRIVE_ACCESS_TOKEN: string;
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function runtimeReadiness(env: Env) {
  const missing: string[] = [];
  if (!env.ECP_EXPEDIENT_STATE) missing.push("ECP_EXPEDIENT_STATE");
  if (!env.ECP_ACCESS_TEAM_DOMAIN || env.ECP_ACCESS_TEAM_DOMAIN.startsWith("REPLACE_")) missing.push("ECP_ACCESS_TEAM_DOMAIN");
  if (!env.ECP_ACCESS_AUD || env.ECP_ACCESS_AUD.startsWith("REPLACE_")) missing.push("ECP_ACCESS_AUD");
  if (!env.ECP_ACCESS_ACTOR_ROLE || env.ECP_ACCESS_ACTOR_ROLE.startsWith("REPLACE_")) missing.push("ECP_ACCESS_ACTOR_ROLE");
  return { missing, ready: missing.length === 0 };
}

function contextReadiness(env: Env) {
  const missing: string[] = [];
  if (!env.ECP_INSTITUTIONAL_INDEX_FILE_ID || env.ECP_INSTITUTIONAL_INDEX_FILE_ID.startsWith("REPLACE_")) missing.push("ECP_INSTITUTIONAL_INDEX_FILE_ID");
  if (!env.ECP_GOOGLE_DRIVE_ACCESS_TOKEN) missing.push("ECP_GOOGLE_DRIVE_ACCESS_TOKEN");
  return { missing, ready: missing.length === 0 };
}

export { EcpExpedientStateDurableObject, ConchitaExecutionStateDurableObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) {
      // Bootstrap safety: never serve the pilot UI until a real Cloudflare Access
      // JWT can be verified. Placeholder team/AUD values fail closed.
      const uiJwt = await verifyCloudflareAccessJwt(request.headers.get("cf-access-jwt-assertion"), {
        teamDomain: env.ECP_ACCESS_TEAM_DOMAIN,
        audience: env.ECP_ACCESS_AUD,
      });
      if (!uiJwt || !uiJwt.subject.trim()) {
        return response({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" }, 401);
      }
      return new Response(ECP_PILOT_HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        },
      });
    }

    if (url.pathname === "/health") {
      const runtime = runtimeReadiness(env);
      const context = contextReadiness(env);
      const providerMissing = [!env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : "", !env.ECP_ANTHROPIC_MODEL || env.ECP_ANTHROPIC_MODEL.startsWith("REPLACE_") ? "ECP_ANTHROPIC_MODEL" : "", !env.ECP_EXECUTION_STATE ? "ECP_EXECUTION_STATE" : ""].filter(Boolean);
      const ready = runtime.ready;
      return response({
        status: !runtime.ready ? "BLOCKED" : !context.ready ? "INTAKE_READY_CONTEXT_BLOCKED" : providerMissing.length ? "INTAKE_READY_ANALYSIS_BLOCKED" : "HEALTHY",
        missing: [...runtime.missing, ...context.missing],
        runtimeReady: runtime.ready,
        institutionalContextReady: context.ready,
        analysisReady: runtime.ready && context.ready && providerMissing.length === 0,
        analysisMissing: providerMissing,
      }, ready ? 200 : 503);
    }

    const runtime = runtimeReadiness(env);
    if (!runtime.ready) return response({ status: "BLOCKED", error: "ECP_WORKER_CONFIGURATION_INCOMPLETE", missing: runtime.missing }, 503);

    const jwt = await verifyCloudflareAccessJwt(request.headers.get("cf-access-jwt-assertion"), {
      teamDomain: env.ECP_ACCESS_TEAM_DOMAIN,
      audience: env.ECP_ACCESS_AUD,
    });
    if (!jwt || !jwt.subject.trim()) return response({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" }, 401);

    if (url.pathname.endsWith("/analysis-readiness") || url.pathname.endsWith("/analyze")) {
      const context = contextReadiness(env);
      if (!context.ready) return response({
        status: "BLOCKED",
        error: "ECP_INSTITUTIONAL_CONTEXT_CONFIGURATION_INCOMPLETE",
        blockers: context.missing,
      }, 503);
    }

    // Identity is derived only from the cryptographically verified Access JWT.
    // Per-subject isolation is safe for the pilot; organization-level tenancy is a later explicit contract.
    const clientId = jwt.subject;
    const actorId = jwt.subject;
    const stateId = env.ECP_EXPEDIENT_STATE.idFromName(`ecp-subject:${clientId}`);
    const reader = new GoogleDriveInstitutionalReader({
      indexFileId: env.ECP_INSTITUTIONAL_INDEX_FILE_ID || "REPLACE_WITH_VERIFIED_CURRENT_INDEX_ID",
      // Intake does not need Drive access. Resolve the secret only when the
      // Context Retrieval Gate actually requests institutional evidence.
      accessToken: async () => {
        if (!env.ECP_GOOGLE_DRIVE_ACCESS_TOKEN) throw new Error("ECP_GOOGLE_DRIVE_ACCESS_TOKEN_MISSING");
        return env.ECP_GOOGLE_DRIVE_ACCESS_TOKEN;
      },
    });
    const handler = createEcpExpedientHttpHandler({
      authenticate: async () => ({ clientId, actorId, actorRole: env.ECP_ACCESS_ACTOR_ROLE }),
      store: new EcpDurableObjectExpedientStore(clientId, env.ECP_EXPEDIENT_STATE.get(stateId)),
      contextGate: new ContextRetrievalGate(createGoogleDriveInstitutionalContextProvider(reader)),
      analyze: async (record, principal) => {
        if (!env.ANTHROPIC_API_KEY) return { status: "BLOCKED", traceId: crypto.randomUUID(), evidence: [], error: "ANTHROPIC_API_KEY_MISSING" };
        if (!env.ECP_ANTHROPIC_MODEL || env.ECP_ANTHROPIC_MODEL.startsWith("REPLACE_")) return { status: "BLOCKED", traceId: crypto.randomUUID(), evidence: [], error: "ECP_ANTHROPIC_MODEL_MISSING" };
        if (!env.ECP_EXECUTION_STATE) return { status: "BLOCKED", traceId: crypto.randomUUID(), evidence: [], error: "ECP_EXECUTION_STATE_MISSING" };
        const resultStateId = env.ECP_EXECUTION_STATE.idFromName(`ecp-analysis:${principal.clientId}`);
        const providerAdapter = new ConchitaAnthropicExecutionAdapter("anthropic", { apiKey: env.ANTHROPIC_API_KEY, maxTokens: 4096 });
        return executeEcpExpedientAnalysis(record, principal, {
          providerAdapter,
          modelId: env.ECP_ANTHROPIC_MODEL,
          contextGate: new ContextRetrievalGate(createGoogleDriveInstitutionalContextProvider(reader)),
          resultStore: new ConchitaDurableObjectExecutionResultStore(env.ECP_EXECUTION_STATE.get(resultStateId)),
        });
      },
    });
    return handler(request);
  },
};
