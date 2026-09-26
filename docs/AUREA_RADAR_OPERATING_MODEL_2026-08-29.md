# AUREA — Radar Operating Model

Date: 2026-08-29
Status: DESIGN + CONTRACT IMPLEMENTATION

## Mission

Radar is AUREA's technology/opportunity-intelligence agent. Its job is to discover, verify, compare and propose useful capabilities; it does not silently install or promote them to production.

## Operating loop

`Discover -> Capture evidence -> Verify -> Reverse benchmark -> Score -> Recommend -> Human/Policy approval -> Register -> Test -> Activate`

## Evidence discipline

Every Radar opportunity must retain source identifiers, capture time, observed claims and verification state. Marketing claims are not treated as facts without verification.

## Reverse-benchmark categories

- Agent patterns
- Reusable Skills
- Connectors
- Providers
- Media capabilities
- Education capabilities
- Platform/building capabilities
- Cost/free-tier constraints
- Security/privacy implications
- Reuse potential inside AUREA

## Dispositions

- `EXPLOIT`: strong evidence and immediate reuse value.
- `INTEGRATE`: implement as a governed AUREA capability.
- `EXPERIMENT`: isolate and test before adoption.
- `WATCH`: promising but insufficient evidence/value.
- `DISCARD`: poor fit, unsafe, redundant or unsupported.

## Benchmark #1 — Claude Code ecosystem video

Source: user-provided MP4 reviewed on 2026-08-29.

Observed themes to benchmark: reusable Skills, connectors/tools, persistent memory/knowledge, provider/tool composition, agent workflows and background observation/learning patterns.

AUREA response: reuse the architectural principles, not proprietary implementation details. Map reusable capabilities to the existing Capability Registry, governed Runtime, Context Store, Provider/Connector boundaries and future learning-capture layer.

## Non-goals

Radar does not:

- create production credentials;
- bypass permissions;
- declare a connector operational without verification;
- replace the Bibliotecario;
- replace the Agent Factory;
- create a second memory system;
- create a parallel runtime.

## Relationship to other AUREA components

`Radar -> Bibliotecario/Knowledge OS -> Reverse Benchmark -> Capability Registry -> Planner/Router -> Governed Runtime`

Radar discovers. The Bibliotecario preserves evidence. The benchmark compares. Registries govern reusable capabilities. The Runtime executes.
