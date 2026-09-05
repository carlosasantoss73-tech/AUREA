# AUREA — Reverse Benchmark / Architecture Adaptation

Date: 2026-08-29
Status: IMPLEMENTATION BASELINE / EVIDENCE-BOUND
Branch: `feat/reverse-benchmark-execution-fabric`

## Purpose

This document records the reverse benchmark of the external agent platform demonstrated to the AUREA team. It is an adaptation study, not a clone specification. Existing AUREA architecture remains authoritative; new work must reuse verified components and must not create parallel replacements.

## Benchmark findings

Observed functional patterns in the reference platform:

1. Agents can be defined from a natural-language outcome rather than hand-built step by step.
2. Skills are reusable capabilities distinct from agents.
3. Skills can be activated/tested independently.
4. Connectors expose external services as tools to agents.
5. Agents execute tools and produce artifacts/reports, not only chat responses.
6. Agents can be scheduled for recurring execution.
7. Memory/knowledge is exposed as an explicit agent capability.
8. Voice, image, video and browser capabilities are treated as tools/capabilities rather than hard-coded into a single agent.
9. The user experience hides orchestration complexity behind an outcome-oriented request.

## AUREA adaptation

### Already verified in current repository

- One controlled runtime execution path.
- Permission Gateway with deny-by-default execution controls.
- Harness/execution envelope and supervision.
- File-backed persistent Context Store.
- Context Retrieval Gate with project-scoped policy evaluation.
- Governed evidence ingestion with idempotency/versioning.
- Test coverage for the current memory/runtime path.

These are not to be replaced by the benchmark architecture.

### New capability direction

AUREA should converge on this controlled flow:

`User outcome -> Context Retrieval -> Planner -> Agent/Skill selection -> Tool/Connector/Provider selection -> governed execution -> validation -> artifact/report -> learning capture`

The benchmark introduces three complementary abstractions that are not currently evidenced as standalone registries in the current repository:

- Skill Registry
- Connector Registry
- Provider Registry

They are represented first as governed metadata registries. They do not establish external connectivity by themselves.

## Execution Fabric target

The future execution fabric should compose, rather than replace, the current runtime:

- Planner: converts an outcome into an explicit execution plan.
- Router: selects existing agents/skills/tools/providers before proposing creation.
- Executor: delegates actual work through the existing governed runtime.
- Scheduler: invokes plans at approved times.
- Retry/idempotency layer: prevents duplicate side effects.
- Validator: checks output and source-bound claims before release.
- Artifact manager: stores structured reports/results.
- Learning capture: records reusable validated knowledge back into the Knowledge OS boundary.

## Media Engine target

Audiovisual work is a priority gap. AUREA should use provider-neutral contracts for:

- image generation/editing;
- video generation/editing;
- voice/TTS;
- music/ambient audio;
- avatars;
- subtitles and social formats.

Providers such as Oreate must remain replaceable. No provider is considered operationally connected until credentials, permissions, adapter behavior, failure handling and tests are verified.

## Governance rules

- Do not clone proprietary implementation details from the reference platform.
- Do not claim that a connector is connected merely because a connector type exists.
- Do not claim production scheduling, external provider execution, or parallel execution until tested.
- Do not convert marketing claims into facts without evidence approval.
- Preserve the existing human-review and deny-by-default security boundary.
- Prefer existing capabilities over creating duplicates.
- Every new reusable capability must have a contract and tests before being marked active.

## Priority order

P0:
1. Capability registries and lifecycle contracts.
2. Planner/execution-plan contract compatible with the current governed runtime.
3. Full regression and CI evidence.

P1:
4. Scheduler and artifact/report contracts.
5. Connector adapters with explicit permission scopes.
6. Provider adapters, beginning with audiovisual providers.

P2:
7. Natural-language agent composer.
8. Parallel execution after safety/idempotency validation.
9. Automated learning capture after validation.

## Definition of done for this benchmark

The benchmark is considered implemented only when each capability has source-level evidence, tests, and a clear verification state. Metadata-only registries are intentionally treated as infrastructure, not as proof of operational connectivity.
