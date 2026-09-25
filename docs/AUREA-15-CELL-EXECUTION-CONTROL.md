# AUREA — 15 CELLS EXECUTION CONTROL

**Status:** OPERATIONAL CONTROL ARTIFACT — does not create new architecture and does not establish implementation or connectivity.

## Purpose

Use the 15 logical cells as parallel work fronts over the existing AUREA repository, while preserving the institutional Knowledge OS as the only authority and the fail-closed boundaries already established.

The cells are **logical parallel functions**, not 15 external AI instances.

## Global gate

Every cell must distinguish:

**DOCUMENTED → IMPLEMENTED → INTEGRATED → VALIDATED → OPERATIONAL → COMMERCIALIZED**

No cell may promote a lower state to a higher state without evidence.

Every completed action records:

**RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN**

## 15 logical cells

| Cell | Front | Immediate objective | Gate / evidence |
|---|---|---|---|
| 01 | Knowledge OS live access | Execute the authenticated v011 probe | Real GitHub Actions run + Google auth + Drive metadata/content |
| 02 | Institutional authority | Preserve v011→previous chain and current-state rules | Unit/integration tests; no inferred fields |
| 03 | Context gate | Preserve institutional-only retrieval | CI green; local fallback remains blocked |
| 04 | Runtime | Connect authority/context to runtime only after verified reader | E2E evidence; fail closed when authority unavailable |
| 05 | Provider adapter | Keep provider contract identity-safe | Adapter health + identity evidence |
| 06 | Multi-provider | Move from scaffolding toward real provider evidence | Real credential + health + execution ID; no CONNECTED by registration |
| 07 | Fallback | Validate real fallback behavior | Two real providers + persisted execution/audit evidence |
| 08 | Platform/Nodriza | Map existing integration boundaries without duplicating architecture | Manifest + inspect/readiness evidence |
| 09 | Work planner | Enforce Librarian pre-build gate | Search evidence before NEW/ADAPT decisions |
| 10 | Work cells | Validate lifecycle/evidence transitions | Registry tests + persisted state |
| 11 | Persistence/recovery | Validate durable snapshot and recovery | Save/recover evidence; no silent state invention |
| 12 | A2A | Maintain live interoperability regression | Successful live CI run; distinguish from provider connectivity |
| 13 | QA/type safety | Maintain P0/typecheck/test health | Green CI and targeted regression suites |
| 14 | Operational audit | Maintain RESULT→EVIDENCE→DECISION traceability | Audit artifacts linked to concrete runs/commits |
| 15 | Integration control | Prevent false readiness claims across AUREA | Status model + blockers; no promotion without evidence |

## Current critical dependency chain

**Cell 01 → Cell 02 → Cell 03 → Cell 04**

The v011 live probe is the current hard dependency for implementing a real institutional reader. Until Cell 01 produces the live payload, no parser may assume undocumented v011 fields.

Parallel cells may continue, but must not bypass this dependency.

## Current verified boundary

- Main baseline: `daa20497e547038fe1f39fe8ec03b65834fc278c`
- BIB-08 probe workflow is present.
- Normal P0/A2A validation is green.
- A manual `workflow_dispatch` execution of the v011 probe has **not** been evidenced in the current session.
- Therefore authenticated Google Drive access is **not claimed**.
- Provider connectivity is **not claimed** merely from adapter scaffolding.

## Cell completion rule

A cell is not considered operational because its source code exists. It requires the evidence defined by its gate and must leave a traceable next action.

## Next execution order

1. Remove the BIB-08 execution blocker if an authorized workflow-dispatch path becomes available.
2. Capture the real v011 payload before defining a parser.
3. In parallel, harden the non-live boundaries: planner, work-cell lifecycle, persistence/recovery, platform readiness, provider identity, and CI regression.
4. Only after the institutional reader is evidenced, integrate it into ContextProvider/Runtime.
5. Then validate real provider execution and real fallback independently.

## Nonclaims

This artifact does **not** claim:
- live Google Drive connectivity;
- a live v011 parser;
- a connected second AI provider;
- real multi-provider fallback;
- commercial operation of Nodriza;
- that any test alone proves production operation.
