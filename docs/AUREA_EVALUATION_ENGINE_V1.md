# AUREA Evaluation Engine V1

## Purpose
Provide one provider-neutral deterministic evaluation primitive for agent domains that must compare requirements against documentary evidence without inventing facts.

## Boundary
This belongs to the AUREA Agent Factory because the pattern is domain-independent.

It does not contain procurement law, survey-specific scoring, SOCE rules, CNEL-specific requirements, provider/model logic, or tenant/White Label logic.

Those remain in domain agents or existing Factory components.

## Contract
The engine receives requirements, evidence records, and a domain comparator.

It returns one explicit comparison per requirement, evidence identifiers actually used, a controlled evaluation state, rationale, optional correction, and blockers for post-offer evidence or malformed comparisons.

## Non-invention guarantees
The engine never creates evidence; never converts missing evidence into compliance; excludes evidence marked as post-offer from the comparator; preserves CONVALIDABLE separately from COMPLIANT; preserves HUMAN_REVIEW for unresolved cases; and requires the comparator to return the same requirement identifier.

## Reuse
AUREA Procurement can use this engine for requirement-by-requirement documentary evaluation.

Future agents can reuse it whenever the workflow is structurally:
REQUIREMENT -> EVIDENCE -> COMPARISON -> VALIDATION -> RESULT

Domain-specific legal, operational, or scoring criteria remain outside the Factory primitive.
