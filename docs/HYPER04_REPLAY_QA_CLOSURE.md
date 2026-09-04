# HYPER-04 — Replay → QA → Closure

## Finding
Durable execution introduced `REPLAYED` results. The result lifecycle previously accepted only `SUCCEEDED`, creating a recovery-path discontinuity: a valid durable replay could not reach independent QA and closure.

## Correction
- `ExecutionResultLifecycle` accepts `SUCCEEDED` and verified `REPLAYED` results as execution-success paths.
- `ExecutionResultQA` validates both statuses with the same trace/provider/evidence controls.
- Replay receives explicit evidence `EXECUTION_REPLAYED_FROM_DURABLE_RESULT` before entering QA.

## Safety
Replay is not an automatic closure. It still requires independent QA/Audit PASS evidence and the normal Work Cell closure gate.

## Verification
Added an end-to-end unit path for durable replay → QA validation → Work Cell CLOSED, plus existing failure/stale-trace tests.
