# AUREA External Code Work Cell V1

## Objective
Provide AUREA with a production-shaped contract for an external coding agent while preserving authority, isolation, evidence, QA, audit, and the no-hidden-swarm rule.

## Initial free-first deployment
The preferred pilot is an open-source coding-agent runtime such as OpenHands, backed by a locally hosted open-weight model or another explicitly configured OpenAI-compatible endpoint. The agent is an external cell only after an actual connection and execution test produce evidence.

## Isolation
- External cell works on a dedicated Git branch.
- It must not write directly to `main`.
- Integration remains PR -> CI -> review/audit -> merge.
- Repository credentials and provider secrets are never placed in prompts or result evidence.
- The cell receives only the knowledge and files required for its assigned objective.

## Contract
Inputs must include:
- CELL_ID
- TRACE_ID
- objective
- company/project scope
- responsibility
- required capabilities
- authority level
- allowed knowledge
- restrictions
- dependencies
- input evidence
- expected output
- validation criteria

Outputs must include:
- result
- facts
- inferences
- assumptions
- risks/contradictions
- evidence
- confidence
- recommended action
- blockers
- reusable learning

## Execution states
`REGISTERED -> CONFIGURED -> CONNECTED -> EXECUTABLE`

Any missing prerequisite is `BLOCKED`. Registration is never treated as execution capability.

## Acceptance gates
### E1 — Contract
AUREA can create and validate an external code-cell request.

### E2 — Isolation
The cell operates only on an isolated branch/workspace and cannot bypass AUREA integration controls.

### E3 — Real connection
A real agent/model endpoint responds to a controlled request. No simulated external result is accepted.

### E4 — Real coding task
The cell completes one bounded AUREA repository task and returns reproducible evidence.

### E5 — Adversarial verification
A separate QA/audit pass checks the result, tests, diff, assumptions, and security boundaries.

### E6 — Reusable learning
The validated operating pattern is recorded and incorporated into the next delegation cycle without regression.

## Current truth
The code-side contract is implemented on branch `feat/external-code-cell-v1`. The external agent itself is **not yet proven connected or executable**. Hardware/model availability and an actual external-agent execution are still required before E3-E5 can be declared complete.

## Completion rule
The External Code Work Cell is `100%` only when E1-E6 have evidence. Until then, its status must remain `PENDING` for the unproven gates.
