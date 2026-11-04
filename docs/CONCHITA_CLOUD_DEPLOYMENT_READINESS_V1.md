# Conchita Cloud Deployment Readiness V1

## Objective
Close the code-side gaps required for the real phone -> HTTPS cloud -> AUREA runtime path without rebuilding existing architecture.

## Current boundary
The HTTP edge already exposes `POST /conchita/v1/message`, bounds JSON requests, applies an origin allowlist, and delegates authentication to the cloud message gate. The cloud gate authenticates the session server-side before creating the internal authenticated request. The runtime bridge then performs admission, provider selection, and execution.

## Readiness gates
- C1 — Cloud transport: publish the HTTP edge behind real HTTPS.
- C2 — Session durability: replace the in-memory pilot session repository with durable, revocable cloud state.
- C3 — Secret boundary: provider credentials exist only as cloud secrets; never browser state or evidence.
- C4 — Executable provider: register a real executable provider adapter and verify live credentials independently.
- C5 — E2E: phone/PWA request reaches cloud, AUREA runtime, provider, and returns a completed response with evidence.
- C6 — QA/Audit: independently verify the E2E trace, authorization, provider execution, evidence, and failure behavior.
- C7 — Recovery: verify safe behavior across expired/revoked sessions, provider failure, duplicate clientRequestId, and cloud restart.

## Non-regression rules
- Do not duplicate `ConchitaCloudMessageGate`, `ConchitaRuntimeBridge`, `ProviderRuntime`, or `ExecutionRuntime`.
- Do not trust browser-supplied identity.
- Do not put provider secrets in PWA code, prompts, logs, or evidence.
- Keep branch -> PR -> CI -> review/audit -> merge.
- A deployment is not considered real until an HTTPS request and response produce reproducible evidence.

## Execution plan
1. Implement only code-side prerequisites that can be proven locally/CI.
2. Prepare the cloud adapter/configuration without embedding credentials.
3. Add deterministic tests for durable-session and deployment-boundary behavior.
4. Run CI on the branch.
5. Merge only after evidence.
6. On a machine with cloud credentials and deployment access, perform C1-C7 and capture production evidence.

## Current truth
C1-C7 are not declared complete by this document. The repository currently proves the code-side HTTP/auth/runtime boundaries; real cloud deployment, durable cloud state, live provider execution, and phone-to-cloud E2E remain evidence-gated.

## Reusable learning
The fastest safe path is to prepare every non-dependent prerequisite before requesting external credentials or deployment access. A blocked infrastructure cell must not block local tests, contracts, documentation, or independent QA preparation.


## Compact project checkpoint — 2026-10-24

### Reused destination (configuration evidence only)

The existing `CONCHITA_EXECUTION_STATE` binding in `wrangler.jsonc` targets the existing `ConchitaExecutionStateDurableObject`, whose SQLite storage already persists execution results and reservations. The checkpoint adapter reuses that same binding and class; it creates no database, public endpoint, or second Knowledge Store.

### Checkpoint contract

- One compact allow-listed checkpoint per `projectId`, maximum 8 KiB.
- Fields: schema version, project ID, timestamp, short summary, completed items, blockers, next action, and evidence references.
- Caller must pass an explicit project allow-list; a project-key mismatch, unknown field, oversized payload, secret-like content, or unavailable Durable Object fails closed.
- No source documents or institutional knowledge are copied. Knowledge OS remains authoritative.
- Checkpoint operations are internal Durable Object binding operations; this change adds no public HTTP route and does not alter Worker secrets or permissions.

### Evidence boundary

- Focused tests simulate saving, recreating the Durable Object instance while retaining the same persistent-storage object, then recovering the identical checkpoint; they also cover project isolation and failure-safe behavior.
- This is a local/CI persistence simulation, **not** proof of a live Cloudflare restart/recovery.
- Live validation remains pending until an authorized operator verifies the existing Worker deployment and runs a controlled save → Worker/object restart or recreation → load check using a non-sensitive test checkpoint. Do not deploy or change Cloudflare configuration merely to mark this gate green.
