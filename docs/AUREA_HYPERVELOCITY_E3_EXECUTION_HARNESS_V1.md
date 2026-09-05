# AUREA HYPERVELOCITY E3 — Executable Harness V1

## Purpose
Convert E3 from an architectural intention into an executable integration boundary without claiming an external agent is connected before real evidence exists.

## Current implementation
`src/aurea-a2a-external-code-cell.ts` provides an A2A v1.0 HTTP+JSON adapter behind the existing `ExternalCodeCellAdapter` contract.

The adapter:
- requires HTTPS;
- sends `A2A-Version: 1.0`;
- sends a bounded AUREA mission with `CELL_ID` and `TRACE_ID`;
- supports bearer authentication without exposing the credential in evidence;
- accepts only non-empty remote results;
- records endpoint origin, protocol version, and remote task/message identity as evidence;
- fails closed on HTTP errors, protocol errors, and empty responses.

## Verification
`src/aurea-a2a-external-code-cell.test.ts` verifies:
- insecure endpoints are rejected;
- the A2A request carries the trace identity and bounded mission;
- remote response evidence is preserved;
- credentials do not enter the result;
- empty remote responses fail closed.

## Gate status
This closes a portion of the **execution-path implementation** for E3. It does **not** close E3 itself.

E3 becomes CLOSED only after:
1. a real external A2A agent endpoint is configured;
2. a real mission is executed;
3. the returned evidence identifies the remote execution;
4. independent QA/audit verifies the result.

## No-regression rule
The adapter is additive and reuses the existing External Code Work Cell contract. It does not modify AUREA runtime admission, provider selection, protected Knowledge OS, or main-branch workflow.
