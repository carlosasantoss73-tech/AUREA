# AUREA — TIKTOK EXPERT KNOWLEDGE PACK V1

## STATUS
Knowledge/implementation pack. It is not proof that the current TCL TikTok integration is live.

## CURRENT AUREA EVIDENCE
Existing repository components:
- `apps/publication-agent/tiktok_api.py`
- `apps/publication-agent/tiktok_oauth.py`
- `apps/publication-agent/tiktok_review.py`
- `docs/tiktok-onboarding-playbook.md`

The existing adapter supports creator inspection, Direct Post initialization, draft-upload initialization, media upload and publication-status verification. OAuth helpers handle authorization URL construction, state validation and token exchange.

## VERIFIED CURRENT PLATFORM FACTS
Verified against current official TikTok developer documentation on September 26, 2026:

1. Content Posting API supports direct posting and upload/draft flows, and the current documentation also covers photo posting.
2. Direct Post requires querying creator information before initializing the post.
3. Direct Post initialization uses the `video.publish` scope and requires user consent.
4. Unaudited clients are restricted to private viewing for posted content until the client passes audit.
5. Each user access token is limited to 6 requests per minute for the Direct Post initialization endpoint.
6. Current Login Kit for Web documentation allows up to 10 registered redirect URIs; each must be absolute HTTPS, static, under 512 characters, and contain no fragment. Parameters in the registered redirect URI are denied.
7. OAuth client secrets and refresh tokens must be stored securely server-side.
8. Upload/draft initialization uses the `video.upload` scope and requires user authorization.
9. PULL_FROM_URL requires the relevant URL prefix/domain ownership verification.
10. TikTok exposes execution identifiers such as `publish_id` and `logid`; the Expert must retain them as evidence where available.
11. Product configuration, scopes, review state, authorization state and production execution state are separate evidence states.

## EXPERT DIAGNOSTIC TREE
A TikTok Expert should diagnose in this order:

A. Identity
- Which TikTok account?
- Which developer organization?
- Which app?
- Is there an existing account/app to reuse?

B. Product configuration
- Login Kit enabled?
- Content Posting API enabled?
- Direct Post enabled if needed?
- Correct platform configuration?

C. OAuth
- Redirect URI valid and HTTPS?
- Requested scopes?
- User authorization completed?
- Access/refresh token lifecycle working?
- CSRF state validation?

D. Review
- App identity fields complete?
- Legal URLs?
- Review explanation?
- Demo evidence?
- End-to-end test?
- Production/audit state verified?

E. Runtime
- Creator info query succeeds?
- Publish initialization succeeds?
- Upload/PULL_FROM_URL succeeds?
- Publish status verifies?
- Error codes and log IDs retained as evidence?

F. Governance
- No secrets in logs?
- No publication without authorization?
- No claim of approval without platform evidence?
- No duplicate account creation when reuse is possible?

## IMPORTANT TCL APPLICATION OF THE EXPERT
The existing AUREA playbook records historical TCL TikTok configuration details. Those details must be re-verified against the current TikTok developer state before being treated as current.

## REUSABLE OUTPUT
Every TikTok diagnosis must return:
- RESULTADO
- EVIDENCIA
- DECISIÓN
- APRENDIZAJE
- ADAPTACIÓN
- SIGUIENTE ACCIÓN
- exact human action required, if blocked
- exact machine action available, if connected
- evidence needed to close the next gate
