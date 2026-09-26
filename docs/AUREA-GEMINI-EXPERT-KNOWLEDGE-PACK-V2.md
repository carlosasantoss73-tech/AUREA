# AUREA — GEMINI EXPERT KNOWLEDGE PACK V2
Status: KNOWLEDGE BASE / NOT PROOF OF LIVE EXECUTION
Cutoff: 2026-09-26

## Purpose
Provide the Tool Expert with authoritative operational knowledge for Google AI Studio and Gemini API. This pack must be versioned and re-audited whenever Google changes terms, policies, APIs, quotas, models, billing, or data handling.

## Authority hierarchy
1. Google official Gemini API / AI Studio documentation and current terms.
2. Google Privacy Policy and service-specific terms.
3. Google Cloud documentation.
4. Reproducible official error/reference documentation.
5. Community cases (Stack Overflow, Google AI Developers Forum, GitHub) as troubleshooting evidence only.
6. Hypotheses/inferences never become institutional facts without verification.

## Core product facts verified 2026-09-26
- Gemini API is accessible through SDKs and REST; current getting-started flow uses the Interactions API.
- Google AI Studio can create a project/API key for new users; API keys are associated with Google Cloud projects.
- New API keys created in AI Studio are moving to auth-key behavior; Google states that standard-key requests are rejected during September 2026 and users should migrate to auth keys.
- Rate limits are evaluated per project, not per API key, and include RPM, TPM, RPD; some models have additional limits.
- Paid tier requires billing; current documentation states a minimum $5 prepayment when setting up paid billing in applicable flows.
- Free and paid tiers have different data-use terms. Current pricing documentation states free usage may be used to improve products, while paid usage is not used to improve products under the paid-service terms.
- Logs/data handling varies by feature, tier, configuration, and geography. Do not make blanket privacy claims.
- Interactions API stores interaction objects by default when store=true; current docs state 55-day retention for paid tier and 1-day retention for free tier, with store=false available subject to feature compatibility.
- Grounding with Google Search/Maps has specific retention rules; zero-retention claims must account for those exceptions.
- Google states that paid-service prompts/responses are not used to improve products, but abuse-monitoring retention may still apply. Guaranteed zero retention / enterprise DPA requirements may require Vertex AI.
- AI Studio access can depend on acceptance of terms, supported region, security checks, and trust/safety status.
- Usage, rate limits and billing are observable through AI Studio dashboards.

## Data/privacy rule
The Expert must never tell a customer that Gemini is "private" or "zero retention" without checking:
project tier, billing state, feature used, storage setting, grounding feature, geography, and current Google terms.
For unpaid services, the current official docs warn that submitted content may be used to improve Google products and that human review may occur. Sensitive/confidential/personal information must not be submitted to unpaid services.
For paid services, Google states prompts/responses are not used to improve products; however, limited abuse-monitoring retention and feature-specific retention can still apply.

## Diagnostic trees

### API key / authentication
Check:
- key exists;
- key belongs to expected Google Cloud project;
- auth-key vs legacy standard key;
- key restrictions;
- Generative Language API enabled;
- IAM/project permissions;
- environment variable/secret source;
- correct endpoint/SDK;
- no secret exposure.
Never request the user to paste the secret key.

### 429 / quota
Check in order:
project -> model -> RPM -> TPM -> RPD -> spend-based limit -> concurrency -> billing tier -> current dashboard.
Do NOT assume creating another API key fixes the problem because rate limits are project-scoped.

### Permission denied / access restriction
Check:
terms accepted -> supported region -> security/trust checks -> project permissions -> API enabled -> key/project relationship -> billing/tier.

### Data/privacy
Before advising on sensitive data:
identify tier -> feature -> storage -> logging -> grounding -> geography -> current terms.
Do not generalize from AI Studio web UI to Gemini API or Vertex AI.

### Production readiness
Require:
secure server-side key handling -> project separation -> quotas -> billing cap/budget -> logging/observability policy -> error handling -> retries/backoff -> verification -> audit trail.

## Community case methodology
Community reports are test cases, not authority. For every case:
- reproduce the symptom if possible;
- identify official documentation matching the error;
- distinguish reported cause from confirmed cause;
- propose the smallest safe test;
- verify the result;
- turn only verified resolution into a reusable playbook.

## Required expert response contract
For every real customer problem:
RESULTADO -> EVIDENCIA -> DECISIÓN -> APRENDIZAJE -> ADAPTACIÓN -> SIGUIENTE ACCIÓN
Also return:
Facts / Inferences / Assumptions / Risks / Evidence / Confidence / Open blockers.

## Privacy and customer trust requirement
AUREA Tool Experts must be designed so customer contracts can explicitly state:
- AUREA does not read customer conversations unless explicitly authorized;
- AUREA does not read private customer files unless explicitly authorized;
- AUREA does not access customer credentials/secrets;
- AUREA may receive minimum technical telemetry required for service supervision;
- tool execution, metrics, technical errors and agent updates are governed by explicit permissions;
- support access is temporary, authorized, logged, and revocable;
- no hidden backdoor;
- material failures are never falsely represented as successful execution.

## Readiness gate
This knowledge pack does NOT make the agent an autonomous Gemini Expert by itself.
The Gemini Expert is considered operational only after:
1. knowledge audit passes;
2. adversarial case suite passes;
3. real Gemini adapter is connected;
4. real authentication is demonstrated without exposing secrets;
5. at least one real read-only diagnostic is executed;
6. at least one real controlled API call is executed;
7. verification evidence is captured;
8. failure/recovery path is demonstrated;
9. telemetry/privacy boundaries are demonstrated;
10. execution identity proves that the Tool Expert, not the ChatGPT conversation, performed the operation.

## Official references
- Gemini API getting started: https://ai.google.dev/gemini-api/docs/get-started
- API keys: https://ai.google.dev/gemini-api/docs/api-key
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Billing: https://ai.google.dev/gemini-api/docs/billing
- Data logging/sharing: https://ai.google.dev/gemini-api/docs/logs-policy
- Interactions: https://ai.google.dev/gemini-api/docs/interactions-overview
- Zero data retention: https://ai.google.dev/gemini-api/docs/zdr
- Troubleshooting AI Studio: https://ai.google.dev/gemini-api/docs/troubleshoot-ai-studio
- Google Privacy Policy: https://policies.google.com/privacy
- Service-specific terms: https://policies.google.com/terms/service-specific

## Important
This document is a knowledge/control artifact. It does not claim live connection to Google, real API execution, or autonomous operation.
