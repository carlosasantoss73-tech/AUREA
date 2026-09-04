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
