# AUREA Agent Creation Acceleration V1

## Purpose

Reduce the time required to create the second, third and subsequent agents by reusing the Factory and converting validated experience into reusable contracts.

## Rule

A new agent must **not rebuild universal infrastructure**. It contributes only domain-specific behavior and knowledge on top of the existing Factory.

## Reuse boundary

Reuse from Factory:
- Agent Contract
- Tenant / White Label
- Evidence Ledger
- Provider-neutral routing
- Deterministic engines
- Evaluation Engine
- Factory validation
- Tool contract
- Common tests and CI

Create per agent:
- Domain rules
- Authoritative knowledge sources
- Domain workflows
- Domain validators
- Domain deterministic tasks
- Domain test cases
- Domain-specific adapters only when required

## Creation pipeline

1. Define mission, scope and limits.
2. Declare authoritative domain sources.
3. Declare domain rules and controlled states.
4. Reuse applicable Factory engines.
5. Implement only domain-specific workflows/validators.
6. Add domain regression tests.
7. Run Factory readiness + domain validation.
8. Pilot with a real case.
9. Promote only validated reusable capabilities back into Factory.

## Learning loop

Every validated agent implementation is reviewed for reusable capabilities.

**DISCOVER → REUSE/CREATE → TEST → PILOT → VALIDATE → GENERALIZE → FACTORY**

A capability enters Factory only when it is demonstrably provider-neutral, domain-independent and reusable by at least one future agent.

## ECP as reference implementation

ECP is the first procurement specialization using the Factory Evaluation Engine. Its experience should be used to improve the creation path, but procurement rules must remain in ECP and must not leak into the universal Factory.

## Anti-bloat rule

Do not create a Factory abstraction merely because one agent uses it once. Generalize only proven cross-agent capabilities.

## Success criterion

Each subsequent agent should require progressively less custom infrastructure and fewer architectural decisions than ECP, while preserving the same validation, traceability and non-invention guarantees.
