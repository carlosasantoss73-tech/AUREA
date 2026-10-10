import { ContextRetrievalGate } from "../context/context-retrieval-gate.js";
import { createGoogleDriveInstitutionalContextProvider } from "../context/google-drive-institutional-context-provider.js";
import { GoogleDriveInstitutionalReader } from "../context/google-drive-institutional-reader.js";
import { createEcpExpedientHttpHandler } from "./expedient-http-api.js";
import { EcpDurableObjectExpedientStore, EcpExpedientStateDurableObject, type DurableObjectNamespaceBinding } from "./expedient-store.js";
import { verifyCloudflareAccessJwt } from "./cloudflare-access-auth.js";
import { ECP_PILOT_HTML } from "./pilot-ui.js";

interface Env {
  ECP_EXPEDIENT_STATE: DurableObjectNamespaceBinding;
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

export { EcpExpedientStateDurableObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) {
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
      const ready = runtime.ready;
      return response({
        status: !runtime.ready ? "BLOCKED" : context.ready ? "HEALTHY" : "INTAKE_READY_CONTEXT_BLOCKED",
        missing: [...runtime.missing, ...context.missing],
        runtimeReady: runtime.ready,
        institutionalContextReady: context.ready,
      }, ready ? 200 : 503);
    }

    const runtime = runtimeReadiness(env);
    if (!runtime.ready) return response({ status: "BLOCKED", error: "ECP_WORKER_CONFIGURATION_INCOMPLETE", missing: runtime.missing }, 503);

    const jwt = await verifyCloudflareAccessJwt(request.headers.get("cf-access-jwt-assertion"), {
      teamDomain: env.ECP_ACCESS_TEAM_DOMAIN,
      audience: env.ECP_ACCESS_AUD,
    });
    if (!jwt || !jwt.subject.trim()) return response({ status: "BLOCKED", error: "AUTHENTICATION_REQUIRED" }, 401);

    if (url.pathname.endsWith("/analysis-readiness")) {
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
    });
    return handler(request);
  },
};
