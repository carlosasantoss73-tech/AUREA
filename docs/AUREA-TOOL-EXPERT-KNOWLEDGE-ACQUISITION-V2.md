# AUREA — TOOL EXPERT KNOWLEDGE ACQUISITION V2

## Objective
The Super Agent continuously improves a Tool Expert without turning the web into an uncontrolled source of truth.

## Research hierarchy
1. Official vendor documentation, repository and API reference: configuration authority.
2. Official release notes/changelog: version drift and breaking changes.
3. Official examples/videos: supported implementation patterns.
4. Community, social, YouTube and forums: failure modes and practical evidence only.
5. Books/blogs/secondary material: background only unless independently verified.

## Research loop
DISCOVER -> CLASSIFY -> FETCH -> EXTRACT -> CROSS-CHECK -> TEST -> LEARN -> VERSION -> AUDIT

The researcher should search vendor docs, changelogs, official channels, GitHub issues/discussions, Reddit/community discussions, relevant social updates, and independent tutorials when troubleshooting.

## Promotion rules
- Official + current + internally consistent + testable: CANDIDATE_FOR_INSTITUTIONAL_VALIDATION
- Community/video/social: TROUBLESHOOTING_OR_LEARNING_EVIDENCE_ONLY
- Conflict: CONFLICT_REQUIRES_OFFICIAL_RECHECK
- Stale: STALE_REQUIRES_REVALIDATION
- Unverified claim: DO_NOT_PROMOTE

## Expert definition
Expertise requires current authoritative knowledge, version-aware procedures, executable adapters, failure modes, verified examples, deterministic assertions, recovery/fallback, provenance, reusable lessons and auditability.

## Learning record
tool_id, topic, claim, source_url, source_tier, observed_at, version, evidence, test_id, validation_status, confidence, supersedes, next_revalidation

## Safety
Never collect credentials/secrets, scrape private accounts without authorization, promote social claims to authority, silently alter institutional knowledge, or execute mutations merely because a tutorial demonstrates them.

## Search templates
<tool> current official docs release notes API changes configuration requirements
<tool> GitHub issues authentication browser crash timeout known failure
<tool> YouTube official tutorial latest
<tool> community troubleshooting Reddit GitHub discussions
<tool> social updates release breaking change

## Four-tool learning targets
Browser Use: profiles, sandbox/CI, success criteria, LLM adapters, sessions, retries, observability.
Skyvern: local/cloud, PostgreSQL, browser/CDP, LLM configuration, artifacts, page/agent APIs, credentials, verification.
Playwright MCP: MCP transport, tool discovery, profiles, headless/CI, safe evaluation, snapshots, timeouts, isolation.
Stagehand: v4 API, localBrowser, Stagehand.create, page/context, act/observe/extract, providers, Browserbase, deterministic verification and migrations.

## Required refresh output
RESULTADO / EVIDENCIA / DECISIÓN / APRENDIZAJE / ADAPTACIÓN / SIGUIENTE ACCIÓN.

## Quality gate
Do not mark EXPERT_READY until current official sources, reconciled changes, a real execution path, independent verification, failure catalog and auditable evidence exist, with no secrets in the knowledge pack.
