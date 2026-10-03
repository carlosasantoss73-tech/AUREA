# AUREA HYPERVELOCITY E3 — Executable A2A Interface V1

## Purpose
Convert the second HYPERVELOCITY MESH point — the A2A interface/gateway — into an executable, auditable boundary without claiming an external agent is connected before real evidence exists.

## Current implementation
`src/aurea-a2a-external-code-cell.ts` provides an A2A v1.0 HTTP+JSON adapter behind the existing `ExternalCodeCellAdapter` contract.

The adapter:
- requires HTTPS;
- sends `A2A-Version: 1.0`;
- uses the A2A HTTP+JSON media type `application/a2a+json`;
- sends a bounded AUREA mission with `CELL_ID` and `TRACE_ID`;
- supports bearer authentication without exposing credentials in evidence;
- accepts direct endpoint configuration, while remaining compatible with A2A Agent Card discovery as a future registration layer;
- accepts only non-empty remote results;
- records endpoint origin, protocol version, and remote task/message identity as evidence;
- fails closed on malformed JSON, HTTP errors, protocol errors, and empty responses.

## Verification
`src/aurea-a2a-external-code-cell.test.ts` verifies:
- insecure endpoints are rejected;
- A2A v1 headers/media type are emitted;
- the mission carries trace identity and bounded scope;
- remote response evidence is preserved;
- credentials do not enter the result;
- empty responses fail closed;
- malformed successful responses fail closed.

## Gate status
This closes the **interface/gateway implementation** portion of E3. It does **not** close E3 itself.

E3 becomes CLOSED only after:
1. a real external A2A agent endpoint is configured;
2. a real mission is executed;
3. returned evidence identifies the remote execution;
4. independent QA/audit verifies the result.

## No-regression rule
The adapter is additive and reuses the existing External Code Work Cell contract. It does not modify AUREA runtime admission, provider selection, protected Knowledge OS, or main-branch workflow.
