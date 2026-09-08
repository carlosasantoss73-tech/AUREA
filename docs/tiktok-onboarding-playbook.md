# AUREA — TikTok Business Onboarding Playbook

## Purpose

Convert the manual TikTok developer onboarding discovered during the TERRAZAS COSTA LIMÓN pilot into a reusable, evidence-driven procedure for future AUREA agents and clients.

## Current sequence

1. Confirm the existing TikTok account/business identity before creating anything.
2. Create or reuse a TikTok for Developers organization that represents the owning business.
3. Create the application under the organization.
4. Select the generic application type that exposes Content Posting API (currently **Otro** in the Spanish portal).
5. Add **Login Kit** because the portal requires it before enabling Content Posting API.
6. Add **Content Posting API**.
7. Enable **Direct Post / Correo directo** only when the product actually requires direct publishing.
8. Request only the scopes the product needs; for the current direct-post path these include `user.info.basic`, `video.publish`, and, only if draft upload is also required, `video.upload`.
9. Configure a valid web redirect URI for Login Kit when the integration is a web application.
10. Complete app identity, category, description, website, Terms, Privacy Policy, platform, review explanation, and demonstration video before submission.
11. Demonstrate the complete user-facing flow in Sandbox for a first review.
12. Submit for review only after the readiness check is green.
13. Treat approval and live API access as separate evidence states; configuration alone never proves approval.

## Non-negotiable safety rules

- Never expose Client Secret or user tokens.
- Never infer TikTok account ownership from a public profile alone.
- Never create duplicate business accounts when an existing account can be reused.
- Never publish, launch ads, or spend money during onboarding unless the user separately authorizes it.
- Never claim API access until TikTok has approved the application and the authorization flow has produced a usable user token.
- Keep diagnosis/configuration separate from mutation and production execution.

## TikTok policy constraint discovered in the pilot

Direct Post is intended for authentic creators and a real user-facing application. TikTok's Direct Post guidelines say a client must not be merely a utility for uploading content to accounts managed by the developer/team. Therefore AUREA's TikTok integration must be designed and demonstrated as a genuine product for authorized business users, not as an internal-only uploader for AUREA's own accounts.

## Reusable evidence model

For each future onboarding run, record:

- business identity and existing account evidence
- organization/app identifiers
- products enabled
- scopes requested
- redirect URI(s)
- legal URLs
- review assets
- sandbox test evidence
- review submission timestamp/status
- authorization evidence after approval
- production publication evidence after explicit launch approval
- failures and the reusable rule derived from each failure

## Current pilot status

The TCL pilot application has been created and has Login Kit + Content Posting API configured, with Direct Post enabled. The portal still reports missing app-review fields. The application has **not** been submitted for review, and no TikTok publication or advertising action has been executed.

## Improvement rule

Every future platform onboarding should first run a deterministic readiness check and present the operator with the smallest remaining human action. The same checker should be reused before submission and after every platform configuration change.
