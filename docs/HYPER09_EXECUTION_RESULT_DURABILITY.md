# HYPER-09 — Durable execution result idempotency

## Objective
Make execution-result idempotency survive a runtime restart without allowing a second provider call for a previously completed `traceId`.

## Implemented
- `ExecutionResultStore` contract with `loadCompleted` / `saveCompleted`.
- `ExecutionRuntime` can hydrate completed results before executing a provider.
- If the durable result store cannot be loaded, execution fails closed before the provider is called.
- A completed result is persisted before it is accepted into the runtime's completed-result cache.
- If persistence of a successful provider result fails, AUREA does not report durable success; the result is returned as `FAILED` with explicit `RESULT_NOT_DURABLY_PERSISTED` evidence.
- `InMemoryExecutionResultStore` is a test/dev adapter only; production durability still requires a real persistent adapter.

## Safety boundary
The provider may already have executed when result persistence fails. Therefore this state is **not** silently retried: it requires recovery/reconciliation before another execution is attempted.

## Verification
Tests cover:
1. replay after a new `ExecutionRuntime` instance using the same store;
2. fail-closed behavior when result-store hydration fails;
3. no durable success when result persistence fails.

## Classification
- Contract: IMPLEMENTED
- Runtime integration: IMPLEMENTED
- Durable production backend: NOT YET VERIFIED
- External provider connectivity: NOT CLAIMED
