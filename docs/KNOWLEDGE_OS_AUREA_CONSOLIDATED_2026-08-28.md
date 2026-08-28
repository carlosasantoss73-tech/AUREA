# AUREA — Knowledge OS Consolidated Update

Date: 2026-08-28
Status: CONSOLIDATED / EVIDENCE-BOUND

## 1. Verified facts

- AUREA repository exists and is in active development; its README describes it as an MVP 0.1 system for intelligent AI-agent orchestration.
- Current repository contains a P0 Permission Gateway implementing deny-by-default decisions, project/capability/tool scoping, destructive-action human approval, and usage limits.
- Current repository contains an AUREA Harness that wraps permission evaluation in an execution envelope and blocks non-ready requests.
- Current repository contains tests covering scoped allow, project denial, destructive approval, usage-limit denial, denied execution, allowed execution, and dry-run behavior.
- Historical AUREA evidence identifies `aurea-piloto-s1` as the real historical project, with Core S1 components including `server/aurea-gateway.ts`, `server/aurea-policy.ts`, `server/aurea-intelligence.ts`, `server/aurea-db.ts`, `server/aurea-router.ts`, `shared/aurea.ts`, and Bibliotecario components.
- Historical evidence reports Core S1, human review, audit, synthetic knowledge, Factory P0, and Knowledge OS P0 as implemented/validated in their original isolated environment.
- Historical Knowledge OS evidence reports versioning, source states, human activation, project isolation, Context Packs, history, and contradiction handling as implemented/validated in `aurea-piloto-s1`.
- Historical evidence explicitly states external generative AI providers and external tools were not implemented/connected in that pilot.

## 2. Current-state interpretation

The current GitHub repository is NOT equivalent to the full historical S1 system. It currently contains a new/isolated security-runtime baseline while historical S1 capabilities remain documented as legacy evidence unless their source code is physically present and tested in the current repository.

Therefore: do not mark the historical Core, Bibliotecario, Factory, Multi-Provider, or external-provider connectivity as integrated into the current AUREA repository merely from documentation.

## 3. Duplicates / overlaps

- Permission Gateway and historical `aurea-gateway.ts` overlap conceptually. They must not be merged by name alone. The current gateway is a compact P0 security boundary; the historical gateway includes pilot-specific budget/idempotency/tool-door behavior. Treat as COMPLEMENTARY/REQUIRES COMPARISON, not duplicate deletion.
- Current Harness is an execution-envelope layer and has no proven historical equivalent in the current repository. Treat as NEW/COMPLEMENTARY.
- Historical Knowledge OS and current security runtime are different layers and must remain separate.

## 4. Contradictions / uncertainties

- Historical documentation reports substantial S1 implementation, while the current public repository does not expose those historical source files. This is not a contradiction in the historical evidence; it is an integration-status gap.
- CI execution for the latest current repository changes has not been independently re-established in this consolidation. Do not label current repository tests as CI-validated without workflow evidence.
- No evidence in the current repository establishes real external provider connectivity. Multi-provider remains NOT CONNECTED unless a later reproducible test proves otherwise.

## 5. Decisions / governance

- Preserve Knowledge OS history and versions; do not overwrite historical states.
- Keep evidence classes separate: FACT / EVIDENCE / INFERENCE / PROPOSAL / UNKNOWN.
- Do not reconstruct historical components when their original implementation can be recovered.
- Do not treat documentation, provider registration, or a passing isolated test as proof of operational integration.
- Human approval remains mandatory for destructive operations.

## 6. Architecture checkpoint

Target conceptual flow remains:
USER → INTENT → KNOWLEDGE → CLARIFICATION → POLICY/FRESHNESS → DECISION → TASK GRAPH → CAPABILITY → AGENT → PROVIDER/MODEL/TOOL → EXECUTION ENVELOPE → GOVERNOR → EXECUTION → QA → RESULT → AUDIT → CONTROLLED LEARNING/MEMORY.

Current repository evidence directly covers only a small P0 security/execution slice of this flow. Historical S1 evidence covers additional layers in an isolated pilot. Integration between them remains PENDING.

## 7. Critical human-approval items

No immediate architectural approval is required merely to preserve this record. Human approval IS required before enabling destructive real-world execution, external provider connectivity, autonomous memory writes, cross-project access, or any bypass of policy/governor/approval controls.

## 8. Next verified action

The next engineering action should be a source-level recovery/comparison of the historical S1 files against the current repository, followed by tests and regression. Do not create parallel replacement implementations until that comparison is complete.
