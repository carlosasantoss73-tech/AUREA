# HYPER-15 — Execution Observability

## Objective
Create a provider-neutral telemetry contract for the execution path so AUREA can measure latency, provider/model identity, QA outcome and explicit cost/token measurements without fabricating missing data.

## Boundary
- `ExecutionTelemetryRecord` is the evidence envelope.
- `InMemoryExecutionTelemetry` is test/local storage only.
- Production persistence must be supplied through an explicit sink/adapter.
- Token counts and cost are optional and must come from measured provider/runtime data.
- Telemetry does not authorize execution and does not replace QA, Audit or Sentinel.

## Acceptance
- Trace, Work Cell, provider and model can be recorded.
- Start/completion timestamps produce deterministic latency.
- QA status and evidence are preserved.
- Missing token/cost measurements remain missing.
- Replay/blocked/failed outcomes are representable.
