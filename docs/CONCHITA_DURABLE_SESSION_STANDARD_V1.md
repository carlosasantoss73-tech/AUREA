# Conchita Durable Session Standard V1

## Purpose
Define the boundary required to move Conchita sessions from pilot-only memory to durable cloud persistence without changing the Gateway contract.

## Non-negotiable rules
- Identity is established server-side; browser input is never identity proof.
- A session is active only when it exists, is not revoked, and has not expired.
- Revocation must take effect on subsequent authorization checks.
- Session persistence is an infrastructure concern; Gateway logic must remain provider-agnostic.
- Production requires a durable repository implementation and controlled secret handling.
- Fail closed on absent, expired, revoked, or malformed session state.

## Contract
`ConchitaDurableSession` carries session identity, owner, mode, creation, expiry, and optional revocation timestamp.
`ConchitaDurableSessionRepository` provides create/get/revoke operations.

## Closure evidence
A durable session implementation is not considered complete until it has:
1. persistence across process restart;
2. revocation enforcement;
3. expiry enforcement;
4. user/session binding;
5. regression tests;
6. exact-head CI green;
7. audit evidence.

## Learning / reuse
The existing `ConchitaSessionStore` contract remains the application-facing boundary. Durable infrastructure should adapt to it rather than duplicate authorization logic.
