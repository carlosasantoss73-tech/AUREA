# AUREA — Parallel Workboard 2026-09-04

## Scope lock
Terrazas Costa Limón is **PAUSED**. This workboard is exclusively for AUREA engineering and governance.

## Operating rule
Independent Work Cells run in parallel. Dependent work waits for the prerequisite evidence. No direct-to-main implementation: **branch → PR → CI → review → merge**.

## Active cells

| Cell | Front | Current action | Dependency | Gate |
|---|---|---|---|---|
| H1 | Execution durability | Persist completed results and restart-safe traceId idempotency | ExecutionRuntime | P0 CI + restart tests |
| H2 | Authority | Resolve all required capabilities/tools under one authority decision | OrganizationalRegistry + Permission Gateway | P0 CI + adversarial tests |
| H3 | Sentinel | Diagnose → classify → verify → learn | HealthLedger + SentinelController | P0 CI + lifecycle tests |
| H4 | QA/Audit | Harden independent result validation and closure evidence | Execution lifecycle | QA/Audit tests |
| H5 | Knowledge | Preserve contextPack provenance through execution/result | Context Retrieval | provenance + isolation tests |
| H6 | End-to-End | Compose objective → plan → context → provider → execution → QA → audit → recovery | H1–H5 | vertical integration tests |
| H7 | Holding | Multi-company registry, company agents, executive/customer channels | H2 + existing router | isolation + authority tests |
| H8 | Provider | Real provider adapters, health, fallback and runtime evidence | provider runtime contract | connectivity evidence |
| H9 | Autonomy | Durable event loop, resume, next-action generation | H1/H4/H6 | recovery + lifecycle tests |
| H10 | Multi-Agent Mesh | External review/benchmark integration where actually connected | PR review infrastructure | review evidence |

## Current executed parallel work

- PR #41 — H1 execution-result durability: OPEN, CI running, Copilot review requested.
- PR #42 — H2 authority + multi-capability resolution: OPEN, CI running, Copilot review requested.
- PR #43 — H3 Sentinel lifecycle: OPEN, CI running, Copilot review requested.
- PR #40 — H7 executive communication routing: MERGED.
- PR #39 — H3/H1 persistence recovery bridge: MERGED.
- PR #38 — execution lifecycle QA sequencing: MERGED.

## Review policy
Copilot review is an independent engineering signal, not a substitute for AUREA QA, security review or human governance. AUREA must never claim that an external AI reviewed code unless GitHub records the review.

## Anti-regression closure
Every merged cell closes with:
1. result;
2. evidence;
3. decision;
4. next action;
5. learning;
6. preventive rule.

Protected Knowledge OS and `INDICE_MAESTRO_v007` remain unchanged unless the President explicitly authorizes a protected change.

## Definition of AUREA operational completion
Objective → AUREA → Plan → Work Cell → Knowledge → Permission → Provider → Execution → Result → Evidence → Sentinel → QA → Audit → Recovery → Learning → Closure, with positive, blocked, failed, recovery and idempotency paths tested.
