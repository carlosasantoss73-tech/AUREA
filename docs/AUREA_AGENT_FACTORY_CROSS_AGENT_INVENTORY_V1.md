# AUREA — Agent Factory Cross-Agent Inventory V1

Date: 2026-10-08
Status: EVIDENCE-BOUND

## Purpose

Consolidate previously built AUREA agent/domain work so the Agent Factory reuses verified capabilities instead of reconstructing them.

## Classification

- FACTORY: provider/domain-independent capability suitable for reuse.
- DOMAIN: business-specific rules, workflows, validators or knowledge.
- CROSS-BRANCH: implementation exists in another active/historical branch and must be merged/recovered before counting it as current Factory code.
- PARTIAL: source/tests exist but full integration or operational deployment is not proven.
- NOT_VERIFIED: no current evidence in the inspected sources.

## Inventory

| Component | Evidence | Current classification | Factory reuse |
|---|---|---|---|
| AUREA Surveys | PR #161; survey manifest + pipeline + deterministic engine | IMPLEMENTED / PARTIAL OPERATIONAL | Yes |
| Survey deterministic calculation | src/factory/deterministic-engine.ts | FACTORY | Yes |
| Evidence Ledger | src/factory/evidence.ts | FACTORY | Yes |
| Evaluation Engine | src/factory/evaluation-engine.ts | FACTORY | Yes |
| Agent Contract | src/factory/agent-contract.ts | FACTORY | Yes |
| White Label / Tenant | src/factory/white-label.ts + TenantConfig | FACTORY | Yes |
| Provider-neutral Router | src/factory/provider-router.ts | FACTORY | Yes |
| Document ingestion contract | src/factory/document-ingestion.ts | FACTORY | Yes |
| Domain Package contract | src/factory/agent-domain-package.ts | FACTORY | Yes |
| Factory readiness validation | src/factory/agent-factory.ts | FACTORY | Yes |
| ECP / Procurement | PR #162 | DOMAIN / IMPLEMENTED FOUNDATION | Yes, domain only |
| Radar | PR #9 branch feat/reverse-benchmark-radar-p1 | CROSS-BRANCH / PARTIAL | Evidence/research patterns |
| Radar Reach | PR #9 branch | CROSS-BRANCH / CONTRACT | Candidate Factory capability after integration |
| Supervisor | PR #9 branch | CROSS-BRANCH / CONTRACT | Candidate Factory governance capability |
| Execution Plan | PR #9 branch | CROSS-BRANCH / CONTRACT | Candidate Factory orchestration capability |
| Scheduler / Artifacts | PR #9 branch | CROSS-BRANCH / CONTRACT | Candidate Factory capability |
| Capability Registry | PR #9 branch | CROSS-BRANCH / CONTRACT | Candidate Factory governance capability |
| Marketing Specialist / Advertising | PR #9 branch includes src/agents/marketing-specialist.ts | CROSS-BRANCH / PARTIAL | Domain reference; inspect before promotion |

## Important boundaries

1. Existence of source code is not equivalent to operational deployment.
2. A contract/registry is not proof of external connectivity.
3. Cross-branch components must be compared and integrated deliberately; do not copy/rebuild them blindly.
4. Domain-specific logic stays in the agent domain package.
5. Provider-neutral, domain-independent capabilities may be promoted into Factory only after tests and cross-domain evidence.
6. Historical agents not supported by current source evidence remain recovery candidates, not operational claims.

## Immediate Factory strategy

1. Keep PR #161 as the reusable Factory base.
2. Keep ECP as the procurement vertical built on that base.
3. Recover/compare PR #9 capabilities against Factory before duplicating any orchestration/governance code.
4. Build a single cross-agent capability matrix.
5. Promote only proven common capabilities.
6. Use the resulting Factory to accelerate subsequent agents.

## Current high-value reuse candidates from existing work

- Evidence-first intake and traceability.
- Deterministic validation/calculation.
- Requirement/evidence evaluation.
- Domain Package composition.
- Capability lifecycle governance.
- Execution-plan validation and dependency handling.
- Radar evidence capture.
- Supervisor human-approval gate.
- Artifact/source traceability.
- White Label/Tenant configuration.

## Non-goals

This inventory does not claim that Radar, external adapters, scheduling, provider connections, multi-provider fallback, or production execution are operational. Those require their own evidence.
