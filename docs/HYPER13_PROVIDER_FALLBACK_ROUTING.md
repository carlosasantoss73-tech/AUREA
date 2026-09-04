# HYPER-13 — Provider Fallback Routing

## Objective
Add a deterministic provider fallback boundary without conflating provider registration with executable availability.

## Design
`ProviderFallbackRouter` consumes the existing `ProviderRuntime` selection contract. It evaluates providers in an explicit order, prioritizes an optional preferred provider, and falls back only to providers that `ProviderRuntime` already considers `EXECUTABLE` for the required capability.

## Safety
- Selection only; the router never executes a provider.
- Existing ProviderRuntime eligibility and fail-closed behavior remain authoritative.
- No provider is invented or implicitly connected.
- Attempt order and selected provider are emitted as evidence.

## Acceptance
Tests cover preferred selection, deterministic fallback from a blocked preferred provider, and fail-closed behavior when no ordered provider is executable.
