# HYPER-08 — Sentinel lifecycle

## Objective
Extend the existing Sentinel kernel beyond observe/contain while preserving its role as an immune system, not an organizational boss.

## Implemented
- `process()` observes a signal and uses the existing `SentinelController` for deterministic CONTINUE / CONTAIN / ESCALATE disposition.
- `diagnose()` records diagnosis, root cause and impact.
- `classify()` records incident classification and recommended action.
- `verify()` records verification and can close a verified incident.
- `learn()` records learning and an optional preventive rule.
- Every lifecycle step is appended to the existing `HealthLedger` with traceable evidence.

## Governance boundary
Sentinel does not change architecture, policies or authority. S4 remains escalated to human governance; S2/S3 containment follows the existing controller policy.

## Verification
Tests cover the full S2 lifecycle and the S4 escalation boundary.
