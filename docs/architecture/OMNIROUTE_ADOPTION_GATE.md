# OmniRoute adoption gate for AUREA and agent pilots

**Status:** proposal / isolated-adoption gate. No production integration is claimed.
**Decision owner:** AUREA project owner.
**Baseline:** existing `main` and the established Universal AI Librarian / institutional index chain.
**Related implementation:** ECP runtime foundation in PR #199; institutional preflight in PR #200; ECP live-reader scope correction in PR #201.

## Decision

Evaluate OmniRoute as an **optional provider-routing gateway**, not as a replacement for AUREA Runtime, the Universal AI Librarian, institutional authorization, persistence, or agent orchestration.

Do not add OmniRoute's full source tree or dependencies to the AUREA application. The published OmniRoute package declares Node.js `>=22.22.2 <23 || >=24.0.0 <27`, while AUREA's current package does not declare a matching runtime requirement. Keep it isolated as a separately deployed service until compatibility, security, cost, and operational tests pass.

Upstream:
- Repository: https://github.com/diegosouzapw/OmniRoute
- Security policy: https://github.com/diegosouzapw/OmniRoute/blob/main/SECURITY.md
- Authorization guide: https://github.com/diegosouzapw/OmniRoute/blob/main/docs/architecture/AUTHZ_GUIDE.md

## Non-negotiable architecture boundaries

1. **Bibliotecario remains the sole institutional source of truth.** OmniRoute routes model requests; it does not store, approve, invent, or replace institutional knowledge.
2. **Keep the existing admission and execution gates.** A request must pass AUREA's project/client scope, permission, evidence/context, and execution controls before provider routing.
3. **Fail closed for ECP.** If approved ECP institutional context cannot be read, do not route a substantive procurement analysis to any model. A second provider does not bypass the context gate.
4. **No implicit fallback across trust boundaries.** Fallback may change the model/provider only within the same authorized request scope and after preserving the same input policy, evidence set, output provenance, and audit trace.
5. **No secrets in Git, prompts, logs, or chat.** Use the hosting platform's secret store and least-privilege credentials. Do not reuse production credentials for tests.
6. **No direct production deployment or PR merge as part of this proposal.** Use a separate environment and explicit deployment approval.
7. **No unverified free-tier assumptions.** Verify each provider's current terms, quota, data handling, and cost before enabling it.

## Minimal integration shape

Existing AUREA flow remains authoritative:

`request -> RuntimeAdmission / authorization -> approved Bibliotecario context -> existing provider interface -> traceable result`

Optional routing adapter:

`existing provider interface -> configured OmniRoute endpoint -> selected provider/model -> normalized response -> existing evidence/provenance and audit handling`

If OmniRoute is unavailable, the default behavior must be an explicit controlled error or the already-approved existing provider path. Never bypass authorization or silently change the model to an unapproved provider.

## Staged validation

### Stage 0 — static review (no deployment)
- Review the pinned upstream release, license, security policy, auth defaults, route exposure, provider configuration, and data/log retention.
- Confirm supported Node/runtime requirements and deployment isolation.
- Confirm which exact upstream features are needed; do not enable MCP/A2A, browser access, or management endpoints by default.

### Stage 1 — isolated smoke test
- Run OmniRoute in a disposable local/staging environment with no production secrets and no institutional documents.
- Use a non-sensitive synthetic prompt and one explicitly configured test provider.
- Verify authentication is required, management routes are not exposed publicly, provider selection is recorded, timeouts are bounded, and shutdown/restart is clean.
- Verify the actual request/response contract against AUREA's existing provider interface before writing an adapter.

### Stage 2 — routing and failure tests
- Test configured primary provider success.
- Test timeout, rate limit, provider error, malformed response, and no-provider-configured cases.
- Verify fallback occurs only when explicitly configured; record actual provider/model used.
- Verify no duplicate billable request occurs unexpectedly and no secrets or sensitive prompt content are written to logs.
- Verify disabled/unreachable OmniRoute cannot disable or bypass AUREA's authorization and institutional-context gates.

### Stage 3 — AUREA adapter in a feature branch
- Implement only a small adapter behind the existing provider interface.
- Keep it disabled by default and configurable by environment.
- Add unit/contract tests with a mocked endpoint; add a separate opt-in live smoke test.
- Preserve request ID, project/client scope, model/provider identity, context references, source hashes/locators, usage/cost where available, and failure reason.
- No writes to the institutional index and no new Librarian implementation.

### Stage 4 — one non-production pilot
- Use a synthetic or explicitly approved low-risk case first.
- Compare correctness, latency, failure recovery, and cost against the existing path.
- Enable only after all acceptance checks below pass.

## Acceptance criteria — do not mark integrated until all pass

- [ ] Upstream version pinned to an exact release/commit and license reviewed.
- [ ] Separate service boundary and runtime compatibility verified.
- [ ] Authenticated endpoint; management interface inaccessible from public clients.
- [ ] Existing AUREA admission, permission, and institutional-context gates remain in front of all provider calls.
- [ ] ECP fails closed when approved institutional knowledge is unavailable.
- [ ] Primary-provider, timeout, error, rate-limit, and fallback contract tests pass.
- [ ] Actual provider/model and request trace are auditable without leaking secrets or sensitive content.
- [ ] Provider terms, data retention, and costs reviewed for each enabled provider.
- [ ] Staging pilot evidence saved; no production claim based on static review or CI alone.
- [ ] Rollback tested by disabling the adapter/configuration.

## Current blockers that OmniRoute does not solve

The latest ECP runbook records that the Worker is not deployed, the live Bibliotecario chain returned no approved ECP records, and the current workflow identity cannot write to `03_AGENTES` (`canAddChildren=false`, `canEdit=false`, `drive.readonly`). These require an authorized institutional access/approval path. OmniRoute cannot fix Google Drive permissions, create institutional approval, or make a pilot operational by itself.

## Work portfolio handling

Use the same optional provider adapter only where an existing project has a compatible provider interface and a justified need. Do not assume AUREA Solar, ECORIA, or XOLAR share the same architecture. Locate and inspect each project's actual repository and runtime before proposing code changes. The GitHub repositories currently confirmed in this review include AUREA and XOLAR; a distinct Solar/ECORIA repository was not identified in the accessible repository listing.

## Evidence log format

For every implementation step, record:

`RESULT -> EVIDENCE -> DECISION -> LEARNING -> ADAPTATION -> NEXT ACTION`

Current result: an isolated adoption plan is documented on a feature branch. No OmniRoute runtime was installed or executed in this action; no production code, secrets, institutional Drive files, or index versions were changed.
