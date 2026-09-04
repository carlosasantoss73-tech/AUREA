# HYPER-07 — Execution provenance

## Objective
Keep the evidence chain from Context Retrieval attached to the execution result without modifying the protected Knowledge OS.

## Implemented
`bindExecutionProvenance()` requires matching `traceId`, accepts only executable context states (`READY` or `NOT_NEEDED`), and carries source IDs, document IDs, context facts, provider/model metadata and execution evidence into one envelope.

## Safety
- trace divergence fails closed;
- blocked/empty context cannot be bound as executable provenance;
- source references are preserved rather than copied into new Knowledge OS content;
- provider identity remains explicit.

## Verification
Tests cover positive provenance retention, trace divergence and blocked context.
