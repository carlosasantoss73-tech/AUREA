# AUREA HYPERVELOCITY — Multi-Agent Prompt Protocol V1

## Purpose
Standardize how AUREA delegates independent analysis to multiple AI agents/providers without confusing registration with availability, without fabricating results, and without allowing parallel work to bypass QA, authority, evidence, or context restrictions.

## Core rule
Parallel intelligence is allowed only when the work is independent enough to execute safely in parallel. Dependencies, authority limits, protected knowledge, and integration gates remain sequential.

## Agent prompt contract
Each delegated cell receives:

- CELL_ID
- OBJECTIVE
- COMPANY_SCOPE
- PROJECT_SCOPE
- RESPONSIBILITY
- REQUIRED_CAPABILITIES
- AUTHORITY_LEVEL
- ALLOWED_KNOWLEDGE
- RESTRICTIONS
- DEPENDENCIES
- INPUT_EVIDENCE
- EXPECTED_OUTPUT
- VALIDATION_CRITERIA
- TRACE_ID

The agent must return:

1. Result
2. Facts
3. Inferences
4. Assumptions
5. Risks / contradictions
6. Evidence used
7. Confidence
8. Recommended action
9. Open blockers
10. Reusable learning

## Five-agent adversarial pattern
When the task warrants multi-agent review, AUREA may assign:

1. ARCHITECT — structure, dependencies, alternatives.
2. IMPLEMENTER — concrete implementation or operational proposal.
3. QA ADVERSARY — attempts to falsify, break, or disprove the result.
4. SECURITY/GOVERNANCE — authority, permissions, isolation, reversibility.
5. AUDITOR — evidence, traceability, closure criteria.

The agents do not vote blindly. AUREA reconciles disagreement using evidence, authority, risk, and explicit decision criteria.

## Parallelization rules
Parallelize when:
- inputs are stable;
- outputs are independently producible;
- no shared mutable state is required;
- failure in one cell cannot silently invalidate another;
- integration can occur through explicit contracts.

Do not parallelize when:
- one result is a hard prerequisite for another;
- two cells would modify the same protected artifact;
- authority/approval is unresolved;
- context or evidence is insufficient;
- concurrent execution could create unsafe side effects.

## No hidden swarm claim
AUREA must distinguish between:
- model/provider actually connected and executable;
- model/provider registered but unavailable;
- internal role/prompt simulation;
- external agent result actually received.

No result may be attributed to an external AI unless AUREA has actual execution evidence.

## Closure
A cell is not complete merely because its analysis is finished. Closure requires result, evidence, QA, audit disposition, learning, and next action. Global completion is decided only by AUREA.

## Learning rule
After every cycle AUREA must preserve what worked, record defects, adapt the reusable method, and prevent regressions. The next prompt should incorporate validated learning without silently rewriting protected architecture or knowledge.

## Recommended orchestration sequence
DECOMPOSE → CHECK DEPENDENCIES → ALLOCATE CELLS → DELEGATE → EXECUTE IN PARALLEL WHERE SAFE → CONTRAST → INTEGRATE → QA → AUDIT → LEARN → NEXT CYCLE.
