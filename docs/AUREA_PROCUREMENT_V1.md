# AUREA Procurement V1

## Boundary

AUREA Procurement is a domain agent derived from the AUREA Agent Factory.
It reuses the universal factory contracts and primitives; it does not recreate the provider router, evidence engine, White Label layer, tenant model, or universal validation contracts.

## Domain objective

Provide an objective, reproducible and auditable analysis of public-procurement processes.

The agent must distinguish:
- fact;
- source;
- evidence;
- calculation/comparison;
- inference;
- unresolved issue;
- conclusion.

It must apply the same evaluation criteria to every bidder and must not invent disqualification grounds, evidence, or legal conclusions.

## Evaluation contract

Every requirement follows:

REQUIREMENT
→ SOURCE
→ EVIDENCE
→ DOCUMENT/PAGE
→ COMPARISON
→ CONVALIDABILITY
→ CONCLUSION

If evidence is insufficient, the result remains unresolved/human-review rather than being forced into compliance or non-compliance.

## Domain modules

Future increments should add, behind explicit contracts:

1. process classification;
2. applicable-regime resolution;
3. requirement extraction from official process documents;
4. bidder evidence indexing;
5. experience evaluation;
6. personnel evaluation;
7. equipment/vehicle/infrastructure evaluation;
8. documentary and identity consistency;
9. convalidation analysis;
10. normative-source verification;
11. red-team review;
12. report and matrix generation.

## Non-goals

- adjudication;
- automatic winner selection;
- artificial elimination;
- creation of post-offer capacity;
- replacing the official contracting authority's decision.

## Implementation status

This increment establishes the domain contract and tests only.
It does not claim that live SOCE integration, normative retrieval, PDF ingestion, provider execution, or end-to-end procurement evaluation is operational.

## Reuse rule

Before creating any new infrastructure component:

SEARCH FACTORY
→ REUSE IF PRESENT
→ IMPROVE IF GENERALIZABLE
→ CREATE ONLY IF ABSENT

## Evidence rule

No conclusion should be represented as definitive unless its documentary basis is available to the execution.
