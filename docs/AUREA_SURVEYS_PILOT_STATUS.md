# AUREA Surveys — Pilot Status

## Verified construction

- Factory contract: implemented.
- Tenant / White Label contract: implemented.
- Evidence ledger: implemented.
- Deterministic P1–P6 engine: implemented.
- Provider-neutral router: implemented.
- Survey execution pipeline: implemented.
- Document ingestion contract/gate: implemented.
- Typecheck: PASS.
- Full repository verification at the latest verified commit: PASS (230/230 tests).

## Historical fixture evidence

The Library contains prior Santas Vainas tabulations. The corrected August 3–6, 2026 workbook reports 137 unique surveys and documents the operational single-assignment rule for multi-service forms. It is reference/fixture material, not evidence that the current pilot PDFs have been processed.

## Real pilot gate

The real pilot requires the actual survey source documents for the target period. The system must compare declared versus extracted survey universe and fail closed on mismatch.

No current 254-survey PDF batch is claimed as processed until those source documents are available to the runtime.

## Next executable step

Attach/provide the target PDF batch. Then:
1. ingest;
2. extract;
3. validate universe;
4. normalize service assignment;
5. validate P1–P6;
6. calculate deterministically;
7. generate evidence;
8. generate institutional Excel;
9. run final QA;
10. release pilot result.
