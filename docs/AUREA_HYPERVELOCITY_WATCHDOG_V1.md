# AUREA HYPERVELOCITY WATCHDOG V1

## Why it exists

AUREA has observed a recurring process failure: an execution method can start strongly, then degrade into short status-only interactions without equivalent execution, evidence, or closure. Human prompting alone is not a reliable control mechanism.

## Control principle

The Watchdog observes only explicit operational output. It does **not** claim access to hidden model reasoning or internal cognition.

Each interaction in an active Hypervelocity cycle emits a Work Pulse containing:

- tool actions;
- code actions;
- decisions;
- artifacts produced;
- evidence produced;
- cells closed;
- blockers;
- whether a next action is explicitly defined.

## Drift gates

### Gate D1 — no-progress limit

After **two consecutive interactions without measurable progress**, the Watchdog emits `RETAKE_CONTROL`.

### Gate D2 — execution decay

The first productive pulse establishes the cycle baseline. A later pulse below the configured decay ratio is flagged as `EXECUTION_SCORE_DECAY`.

### Gate D3 — blocker honesty

If a blocker exists and no next action is defined, the Watchdog returns `BLOCKED_EXTERNAL` rather than allowing repeated status messages.

## Required recovery sequence

`INSPECT STATE -> IDENTIFY CELL -> EXECUTE -> SELF-VERIFY -> CORRECT -> TEST -> EVIDENCE -> CLOSE OR BLOCKED-EXTERNAL`

The orchestrator must not respond to a drift alert with another generic activation message.

## Two-interaction closure target

The preferred operating target is:

- Interaction 1: parallel cells execute independently and produce findings/corrections.
- Interaction 2: cells cross-review, resolve contradictions, retest, and close.

If a hard external dependency prevents closure, the second interaction must produce an explicit `BLOCKED-EXTERNAL` record containing the exact dependency and evidence required to unblock it.

This is a throughput target, not permission to skip evidence or compress independent work that genuinely requires more cycles.

## Non-regression

The Watchdog is additive. It does not replace Work Cell authority, AUREA orchestration, QA, audit, provider selection, or execution gates. It protects those mechanisms by detecting process drift before it becomes normal behavior.

## Reusable learning

AUREA should measure the quality of the **work loop**, not merely the correctness of its final answer. A healthy mesh is one in which every interaction either advances execution/evidence/closure or explicitly escalates a concrete blocker.
