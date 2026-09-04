# HYPER-10 — Authority + Multi-Capability Resolution

## Rule
AUREA must never interpret capability possession as authority. Authorization requires agreement between:
1. organizational responsibility;
2. active agent identity;
3. authority profile and scope;
4. every required capability;
5. every tool required by those capabilities;
6. Permission Gateway decision.

## Implemented
`AuthorityMultiCapabilityResolver` is an additive boundary that resolves the complete capability set and evaluates each required tool through the existing Permission Gateway. A single denied/approval-required capability or tool blocks the aggregate authorization.

## Deliberate limits
- It does not replace `Permission Gateway`.
- It does not mutate the protected Knowledge OS.
- It does not grant authority to an agent that the Organizational Registry does not associate with the responsibility.
- It does not infer approval from capability availability.

## Verification
Tests cover full authorization, missing authority for one capability, and a tool outside the execution allowlist.
