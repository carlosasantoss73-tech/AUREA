# AUREA Agent Factory V1

This document maps the universal factory architecture to the existing AUREA repository without reconstructing the platform.

## Implementation boundary

The factory adds provider-neutral contracts and reusable primitives under `src/factory`.
Domain agents live under `src/agents`.
Existing AUREA orchestration, security, sentinel, persistence and knowledge components remain authoritative for their existing responsibilities.

## First vertical

`aurea-surveys` is the first factory-derived agent. V1 intentionally starts from structured survey records so the deterministic domain engine can be validated before adding PDF extraction or client-specific normative ingestion.

## Status semantics

Presence of code is not proof of integration. Factory readiness is evaluated separately from repository presence and from live provider/runtime availability.

## Verification target

The first implementation gate is:
1. Typecheck passes.
2. Factory unit tests pass.
3. Survey deterministic tests pass.
4. Provider router tests pass.
5. White-label/tenant validation passes.
6. No existing AUREA test contract is changed.

## Next construction increment

Add document/PDF ingestion behind a tool contract, then add the CNEL knowledge pack only from authoritative supplied documents. Do not hardcode normative claims that have not been sourced.
