# Conchita Cloud API Contract V1

## Purpose

Define the transport boundary required to move Conchita from a local PWA shell to a real cloud-connected pilot without moving XOLAR/AUREA authority, secrets, knowledge, or execution capability onto the phone.

## Canonical flow

`Phone PWA -> HTTPS API -> authenticated session -> ConchitaRuntimeBridge -> RuntimeAdmission -> ProviderRuntime -> ExecutionRuntime -> QA/Audit -> response`

## Endpoint

`POST /conchita/v1/message`

Transport requirements:

- HTTPS only outside local development.
- Authentication is established by the server; the client must not self-assert identity.
- Session must be revocable and server-controlled.
- Request must carry a client-generated idempotency key (`clientRequestId`).
- Server generates/propagates the authoritative `traceId`.
- CORS must be explicit if the PWA origin differs from the API origin.
- Credentials must be sent only when the deployment uses a credentialed browser session.
- No provider secret, master credential, privileged tool token, or full knowledge corpus is sent to the client.

## Request boundary

The application-level request uses the existing canonical Conchita contract. `userId` is treated as an authenticated server-side identity assertion, not as proof of identity supplied by the browser.

Before invoking the runtime, the gateway must establish:

1. authenticated principal;
2. active/revocable session;
3. session-to-user binding;
4. request schema validity;
5. idempotency/replay policy;
6. AUREA permission admission;
7. trace/evidence context.

## Response boundary

The server returns only the result required by the client, plus safe operational metadata:

- `sessionId`
- `clientRequestId`
- `traceId`
- status
- response when successful
- evidence reference/summary appropriate for the client
- blockers when execution is blocked

Internal prompts, provider credentials, hidden policy state, unrestricted knowledge, and privileged execution details remain server-side.

## Failure behavior

Fail closed on:

- missing/invalid authentication;
- unknown or revoked session;
- user/session mismatch;
- malformed request;
- replay not explicitly allowed;
- missing permission;
- unavailable/non-executable provider;
- runtime admission failure.

Do not silently downgrade security controls to make the pilot appear functional.

## Production gate

This contract is necessary but not sufficient for production. The pilot is not production-ready until the transport is bound to a real authenticated HTTPS endpoint, session state is durable/revocable, a real executable provider adapter is available, and E2E + QA/Audit evidence closes the complete path.
