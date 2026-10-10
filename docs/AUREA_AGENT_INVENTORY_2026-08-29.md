# AUREA — Agent Inventory and Operational State

Date: 2026-08-29
Status: EVIDENCE-BOUND

## Classification rule

- OPERATIONAL: source-level implementation exists and current tests/CI provide evidence for the claimed behavior.
- IMPLEMENTED: source exists but deployment/continuous autonomy or complete end-to-end evidence is missing.
- HISTORICAL: documented in earlier AUREA/S1 checkpoints but not yet recovered and compared against the current runtime.
- DESIGNED: architecture/contract exists without an operational implementation.
- NOT VERIFIED: claim cannot currently be supported by repository evidence.

## Bibliotecario / Knowledge OS

State: IMPLEMENTED / PARTIALLY OPERATIONAL.

Evidence: persistent Context Store, governed memory ingestion, idempotency/versioning, project-scoped retrieval and black-box persistence/retrieval tests are present. The current repository explicitly states that automatic ingestion of every ChatGPT conversation and external document connectors are not verified.

Interpretation: this is not merely a concept. It is a working memory/context subsystem, but not yet a universal automatic librarian connected to every desired source.

## Radar

State: IMPLEMENTED / PARTIALLY OPERATIONAL.

Evidence: Radar has an operating model and reverse-benchmark loop; the current branch adds the evidence-first Radar Reach boundary. Radar is not yet proven to run continuously against external public sources without a scheduler/deployed adapters.

Interpretation: Radar is a real AUREA agent capability, but continuous autonomous operation remains a deployment/integration milestone.

## Historical Agent Factory / S1 agents

State: HISTORICAL / RECOVERY REQUIRED.

Evidence: the Knowledge OS checkpoint explicitly says historical S1 components include Factory P0 and Knowledge OS P0, but their source must be recovered and compared before treating them as current-runtime agents.

## Other current agents

No additional agent should be counted as operational until a current source-level implementation and verification evidence are located. Absence from the current code search is not proof that historical work never existed; it is a reason to recover/compare the historical source.

## Immediate recovery task

Recover historical S1 Agent Factory/agent definitions, compare them against the current runtime, classify each agent, and reuse verified implementations instead of rebuilding them.

## Target agent lifecycle

`Discover/Define -> Compose -> Validate -> Activate -> Execute -> Observe -> Learn -> Version -> Retire`

Radar and Bibliotecario are distinct roles:

- Radar discovers and evaluates external opportunities.
- Bibliotecario preserves governed knowledge/evidence and supplies context.
- Agent Factory creates/manages reusable agents.
- Runtime executes governed actions.
