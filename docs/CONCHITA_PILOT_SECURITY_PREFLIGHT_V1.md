# Conchita Personal V0 — Security Preflight V1

## Purpose

Prevent the pilot from being treated as production-ready before the cloud boundary is actually secure.

## Non-negotiable boundary

`Phone/PWA -> HTTPS authenticated transport -> Cloud Gateway -> ConchitaRuntimeBridge -> RuntimeAdmission -> ProviderRuntime -> ExecutionRuntime`

The phone must never hold provider API keys, XOLAR master credentials, AUREA administrative credentials, unrestricted execution authority, or the full Knowledge OS.

## Preconditions for production

- [ ] HTTPS only; reject insecure transport.
- [ ] Server-side authentication establishes the user identity. Never trust a client-supplied `userId` as the source of identity.
- [ ] Session state is durable and revocable; in-memory sessions are pilot-only.
- [ ] Session is bound to authenticated principal and channel/device policy.
- [ ] Authorization is enforced server-side before runtime admission.
- [ ] CSRF protection is defined if browser cookies are used for authentication.
- [ ] Credentialed CORS uses an explicit allowlist of origins; never `*` with credentials.
- [ ] Cookie authentication uses Secure, HttpOnly and an intentional SameSite policy.
- [ ] Message requests have bounded size and rate limits.
- [ ] `clientRequestId` is used for idempotency/replay protection at the transport boundary.
- [ ] Trace IDs propagate into RuntimeAdmission, ProviderRuntime and ExecutionRuntime evidence.
- [ ] Errors returned to the client do not disclose secrets, internal stack traces, provider credentials, or unrestricted internal context.
- [ ] Provider selection remains fail-closed when no executable provider is available.
- [ ] Destructive/external effects remain behind existing permission controls and approval gates.
- [ ] QA and Audit evidence is required before declaring the pilot production-ready.

## Known current limitations

1. The current Gateway stores sessions in memory.
2. The current PWA sends a minimal message envelope; a real authenticated transport adapter must construct the canonical server-side request context.
3. A deployable cloud endpoint has not yet been selected/implemented in this repository.
4. No claim of production security is made until transport, identity, durable sessions, and E2E controls are validated.

## Threat-oriented tests to add

- Missing/expired session -> BLOCKED.
- Wrong principal/session binding -> BLOCKED.
- Replayed `clientRequestId` -> no duplicate execution.
- Oversized message -> BLOCKED before runtime admission.
- Unapproved origin -> rejected by transport layer.
- Missing credentials -> rejected by transport layer.
- Provider unavailable -> fail-closed/fallback according to existing provider policy.
- Runtime permission denied -> no provider execution.
- Execution failure -> evidence preserved and no false success response.
- Gateway/runtime exception -> sanitized client response with traceability.

## Release gate

The pilot may be installed as a UI shell before the cloud endpoint exists, but it must not be represented as a functional production Conchita until all production preconditions and threat-oriented tests are green.

## Learning / reuse rule

Every discovered failure must be converted into: root cause -> correction -> regression test -> reusable rule. Existing working controls are reused; no parallel security architecture is created without evidence that the current control cannot satisfy the requirement.
