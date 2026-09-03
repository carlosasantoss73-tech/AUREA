# AUREA HYPERVELOCITY — Workboard 2026-09-03

## Operating mode
Multi-Agent Work Cell Orchestration. Independent cells advance in parallel; dependent cells remain gated. Existing protected artifacts are not overwritten or replaced without explicit authorization.

## Global objective
Reduce the distance between President objective and safe, executable, verifiable, auditable, reusable AUREA action.

## Cells

| Cell | Front | Current objective | Dependency | Closure evidence |
|---|---|---|---|---|
| H1 | Execution | Controlled provider/tool execution with explicit metadata | Admission | result + evidence + tests |
| H2 | QA/Audit | Independent validation of execution result | H1 contract | QA + audit evidence |
| H3 | Persistence | Durable work/result continuity and recovery | Existing stores | restart/recovery tests |
| H4 | Autonomy | Close lifecycle from objective through learning | H1 + H2 | transition + closure evidence |
| H5 | Organization | Authority, scopes, agent assignment | Existing registry | resolution/permission tests |
| H6 | Sentinel | Full detect→diagnose→contain→verify→learn lifecycle | Health ledger | incident lifecycle evidence |
| H7 | Knowledge | Retrieval/context/result provenance integration | Existing context layer | provenance + isolation tests |
| H8 | Platform | Integration readiness and runtime health evidence | H1/H7 | readiness evidence |
| H9 | Workboard | Persistent global work state and dependencies | H3 | recovery + dependency tests |
| H10 | Prompt Intelligence | Multi-agent delegation contracts and disagreement handling | H2/H6 | prompt contract + adversarial tests |

## Parallel batches

### Batch A — immediate
H1, H5, H6, H7, H10

### Batch B — after required contracts are stable
H2, H3, H8, H9

### Batch C — integration
H4 + end-to-end vertical validation

## Mandatory anti-regression gate
Before declaring a batch complete:
- inspect current repository state;
- run typecheck/tests through CI or equivalent evidence;
- separate pre-existing failures from new failures;
- preserve protected artifacts;
- record result, evidence, decision, next action, learning.

## Current blocker
CI detected TypeScript errors in pre-existing files plus execution-runtime test signature errors. These must be handled as an independent sanitation cell and not hidden inside H1.

## Success criterion
AUREA is not considered operational merely because contracts exist. Operational maturity requires an executable path with controlled provider selection, real result/evidence capture, independent QA/audit, persistence/recovery, Sentinel verification, and a closed learning cycle.
