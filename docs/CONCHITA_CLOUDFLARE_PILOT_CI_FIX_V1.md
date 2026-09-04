# Conchita Cloudflare Pilot — CI Fix V1

The first Cloudflare pilot candidate exposed a TypeScript contract diagnostic before merge. The fix makes the Worker HTTP handler return type explicit and invokes the returned handler through the declared transport boundary. No runtime architecture is duplicated and `main` remains unchanged until CI passes.

## Verification note

A diagnostic run against PR #78 reported the pre-fix `TS2554` at `src/conchita-cloudflare-worker.ts(165,46)`. The current branch source contains the explicit handler construction fix. A fresh P0/verification run must be observed against the current head before this branch is considered green; the earlier failed run is not evidence against the corrected source.

## Reusable learning

When CI is triggered on a pull-request merge ref during rapid successive commits, validate the exact `head_sha` and source contents before applying another code change. Preserve the diagnostic evidence, avoid speculative fixes, and require a fresh run on the current head before closure.
