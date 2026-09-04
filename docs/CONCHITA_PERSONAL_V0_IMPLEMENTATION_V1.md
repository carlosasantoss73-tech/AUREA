# Conchita Personal V0 — Implementation Boundary V1

## Objective

Provide the owner with a mobile interface to Conchita while keeping the intelligence and execution stack in the cloud.

## Non-negotiable architecture

`Phone App -> Secure Gateway -> XOLAR/Conchita -> AUREA controls -> Providers/Agents/Tools -> Result -> Phone`

The mobile app is a thin client. It does not contain the Core, full knowledge base, provider secrets, execution authority, or master credentials.

## V0 capabilities

- authenticated personal session;
- text conversation;
- PERSONAL/XOLAR mode boundary;
- server-generated traceability;
- request validation and fail-closed behavior;
- response/evidence envelope;
- controlled future extension to voice, notifications and tools.

## Reuse from AUREA

- orchestrator and dependency-aware planning;
- Context Retrieval Gate;
- Permission Gateway / Execution Gate;
- Provider Runtime and fallback;
- Execution Runtime and durable result controls;
- Runtime Events;
- Sentinel;
- QA/Audit Gate;
- execution telemetry;
- recovery decision boundary.

## Security boundary

The client must never be trusted as an authority source. Authorization is evaluated server-side. Device/session revocation must invalidate access without requiring changes to the XOLAR Core.

## Definition of Done

1. A user can authenticate from the mobile client.
2. The client can open a personal session.
3. A message reaches the cloud gateway with a client request ID.
4. The gateway creates/propagates a trace ID.
5. Conchita receives the request through the existing orchestration/runtime controls.
6. The response returns with status, traceability and evidence.
7. Unauthorized or malformed requests fail closed.
8. E2E QA passes without weakening existing AUREA controls.

## Explicit non-goals for V0

- embedding XOLAR locally on the phone;
- offline autonomous execution;
- exposing provider credentials;
- bypassing Permission Gateway, Sentinel, QA or Audit;
- rebuilding existing AUREA runtime components.
