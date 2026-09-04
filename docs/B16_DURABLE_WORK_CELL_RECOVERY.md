# B16 — Durable Work Cell Recovery

This iteration introduces a storage adapter for Work Cell snapshots and lifecycle transitions.

## Boundary

- `WorkCellRegistry` remains the authoritative in-process state boundary.
- `WorkCellFileStore` is a durable persistence/recovery adapter.
- Persistence uses atomic temporary-file write + rename.
- Recovery returns a cloned snapshot and never mutates the registry by itself.

## Controlled recovery rule

Persistence is not equivalent to recovery orchestration. A future recovery controller must validate snapshot integrity, compare lifecycle state, preserve trace/evidence, and only then restore authoritative state.

## Reuse rule

Future durable Work Cell implementations should reuse this snapshot/transition contract instead of introducing independent state stores.
