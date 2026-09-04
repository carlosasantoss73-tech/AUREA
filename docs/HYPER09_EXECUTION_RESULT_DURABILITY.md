# HYPER-09 — Durable execution result idempotency

## Objective
Make execution-result idempotency survive a runtime restart without allowing a second provider call when a previous execution is already completed or remains ambiguous.

## Implemented
- `ExecutionResultStore` exposes durable `loadState`, `reserve`, `commitCompleted` and `releaseReservation` semantics.
- `ExecutionRuntime` hydrates completed results and outstanding reservations before provider execution.
- A trace is reserved before the provider is called.
- A completed trace is replayed rather than executed again.
- Provider failure releases the reservation so a controlled retry is possible.
- Durable commit failure retains the reservation and blocks duplicate execution until reconciliation.
- If the durable store cannot load, execution fails closed before the provider is called.
- `InMemoryExecutionResultStore` is a test/dev adapter only; production durability still requires a real persistent adapter.

## Safety boundary
The difficult case is provider success followed by persistence failure: the provider may already have executed while the durable result is unknown. AUREA therefore retains the trace reservation instead of silently retrying. A production store must make reservation/commit durable and support reconciliation.

## Verification
Tests cover:
1. replay after a new `ExecutionRuntime` instance;
2. fail-closed store hydration;
3. duplicate prevention after commit failure;
4. controlled retry after provider failure.

## Classification
- Contract: IMPLEMENTED
- Runtime integration: IMPLEMENTED
- Durable production backend: NOT YET VERIFIED
- External provider connectivity: NOT CLAIMED
