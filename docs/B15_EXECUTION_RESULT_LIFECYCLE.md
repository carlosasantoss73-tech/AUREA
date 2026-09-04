# B15 — Execution Result Lifecycle

## Objective
Close the gap between provider execution and the authoritative Work Cell lifecycle.

## Controlled path

`RUNNING -> QA -> COMPLETED -> CLOSED`

A successful execution may enter QA, but closure requires explicit QA PASS and Audit PASS evidence. Execution failures transition to `FAILED`; blocked execution transitions to `BLOCKED`.

## Invariants

- The execution result and lifecycle request must share the same `traceId`.
- The Work Cell must be `RUNNING` before applying an execution result.
- Missing QA/Audit validation leaves the cell in `QA` and blocks closure.
- QA/Audit validation is recorded in the authoritative Work Cell Registry.
- Closure is only reached after both QA and Audit pass.
- The registry remains the source of truth for state.

## Evidence

The lifecycle component emits/retains execution evidence, validation evidence, and state-transition evidence. The existing `QAAuditGate` remains the independent closure gate.

## Known boundary

`WorkCellRegistry` is still an in-process authoritative registry. Durable persistence/recovery remains a subsequent integration cell and must not be inferred from this component alone.

## Learning rule

This iteration formalizes a reusable pattern: **result → validation → authoritative state → closure evidence**. Future execution integrations must reuse this lifecycle rather than inventing parallel state transitions.
