# Conchita — Cloudflare Pilot Setup V1

## Purpose

Put the existing Conchita control/execution path behind a real HTTPS Cloudflare Worker without replacing or duplicating AUREA runtime boundaries.

## Architecture

`Phone/PWA → Cloudflare Worker → Cloud Session Gate → Conchita Gateway → RuntimeAdmission → ProviderRuntime → ExecutionRuntime → Anthropic → response`

The Worker also keeps the existing `ContextRetrievalGate` in the path. This first cloud slice deliberately does not fabricate historical context storage; when no cloud context is available, the gate returns `NOT_NEEDED` for ordinary messages.

## Cloudflare configuration

1. Create one Workers KV namespace named `conchita-sessions`.
2. Put its namespace ID into `wrangler.jsonc` as `CONCHITA_SESSIONS`.
3. Set these Worker secrets in Cloudflare:
   - `ANTHROPIC_API_KEY`
   - `CONCHITA_PILOT_BOOTSTRAP_TOKEN`
4. Set these non-secret Worker variables:
   - `CONCHITA_ANTHROPIC_MODEL` — use an active Anthropic API model available to the account.
   - `CONCHITA_PILOT_USER_ID` — pilot user identifier.
   - `CONCHITA_ALLOWED_ORIGIN` — exact HTTPS origin of the Conchita Pages site.

Never put API keys or the bootstrap token in Git, the PWA, evidence, or logs.

## Deployment

The repository includes a **manual-only** GitHub Actions deployment workflow. It requires GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare API token must be scoped only to the account/resource needed for the Worker deployment.

## First phone pilot

1. Deploy the Worker and record its `workers.dev` HTTPS URL.
2. Open the Conchita Pages URL and enter the Worker URL plus the pilot bootstrap token in the activation panel.
3. The PWA requests a short-lived session. Only the resulting session ID is kept in `sessionStorage`; the bootstrap token is discarded.
4. Send `Hola` and verify a `COMPLETED` response.
5. Preserve the returned evidence and trace as the first reproducible C5 evidence package.

## Evidence gates

- C1: real HTTPS Worker responds.
- C2: session persists in KV and revoked/expired sessions fail closed.
- C3: provider secret exists only in Worker secret storage.
- C4: Anthropic adapter executes against a real credential.
- C5: phone/PWA → cloud → AUREA → provider → response is reproducible.
- C6: independently inspect trace, authorization, provider evidence and failure behavior.
- C7: validate expiration/revocation, provider failure and duplicate/replay behavior.

## Known pilot limitation

The KV execution result adapter preserves durable replay state, but KV is not a transactional compare-and-swap store. It is acceptable for the single-user pilot; production-grade concurrent idempotency should move to a strongly serialized storage boundary before scaling the workload.
