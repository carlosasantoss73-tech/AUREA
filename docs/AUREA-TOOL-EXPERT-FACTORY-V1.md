# AUREA — TOOL EXPERT FACTORY V1

## RESULTADO
Define the reusable capability layer that turns a platform/tool into a specialist agent without creating a new architecture for every platform.

## EVIDENCIA
Current AUREA already contains:
- `apps/publication-agent/` with diagnosis, planning, approval, execution boundary and learning hooks.
- `docs/tiktok-onboarding-playbook.md` with a reusable TikTok onboarding procedure.
- `docs/AUREA_HYPERVELOCITY_MULTI_AGENT_PROMPT_PROTOCOL_V1.md` with the 15-cell/multi-agent delegation contract.
- TikTok adapter and OAuth modules already exist in `apps/publication-agent/`.

## DECISIÓN
Do not rebuild the agent system. Adapt the existing Publication Agent pattern into a generic Tool Expert Factory.

Pipeline:

Tool Profile → Knowledge/Playbook → Skills → Adapter/Tools → Specialist Agent → Verification → Reusable Learning → Product

A specialist must:
1. know the documented procedure;
2. diagnose current state;
3. ask only for missing information;
4. prepare the smallest safe action;
5. execute only through authorized tools;
6. verify the resulting state;
7. record reusable learning;
8. expose the capability as a reusable product.

## AUTONOMY CONTRACT
Natural-language objective is the primary user interface.

Example:
"Connect Gemini API to AUREA."

The specialist should determine:
- what is known;
- what is missing;
- which official procedure applies;
- which tools are available;
- which actions are read-only;
- which actions mutate state;
- what approval/credential is required;
- how success will be verified.

It must never invent access, permissions, approvals, execution or success.

## P0 OFFICIAL-SOURCE GATE
Before configuring, modifying, connecting or executing any external tool, API, Cloud, AI, platform or service:
1. identify the exact product;
2. locate the current official documentation and terms/policies;
3. verify version/date and relevant changes;
4. verify requirements, permissions, credentials and restrictions;
5. determine the current procedure;
6. only then configure or execute.

Community sources are troubleshooting evidence, not configuration authority.

## KNOWLEDGE MODEL
A specialist is not made "expert" merely by stuffing a document into a prompt.

Expertise is represented as:
- authoritative documentation;
- structured procedures/playbooks;
- tool/adapter contracts;
- known failure modes;
- tests;
- verification criteria;
- reusable lessons;
- provenance and versioning.

## PRODUCT TIERS
1. Expert Knowledge — diagnosis and instructions.
2. Assisted Operator — prepares and guides actions.
3. Connected Operator — executes authorized actions and verifies them.
4. Managed Specialist — maintains playbooks, readiness and drift checks.
5. Enterprise Specialist — multi-account governance, audit and organization-specific knowledge.

## FIRST PRODUCTS
- TikTok Expert
- Gemini/API Expert
- Meta Expert

The generic factory is the product; each platform specialist is a packaged capability.
