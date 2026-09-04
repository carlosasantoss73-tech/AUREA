# Conchita Proactive Review Ledger V1

## Review cycle

`DETECT -> DIAGNOSE -> CORRECT -> TEST -> EVIDENCE -> PREVENT -> RECHECK`

## Findings addressed in this cycle

### Identity spoofing boundary
- Finding: the previous gateway could compare session ownership against caller-supplied `userId`.
- Correction: authenticated-principal validation is now an explicit gateway entry boundary.
- Prevention: missing principal blocks before the handler; session ownership is checked against the authenticated principal.
- Regression: dedicated security tests cover missing principal and mismatched caller identity.

### Mobile request contract drift
- Finding: the PWA sent `{text, channel}` while the canonical contract requires session, message and client request identity.
- Correction: PWA now sends the canonical application fields and treats server authentication as authoritative.
- Prevention: future transport changes must update the canonical contract and client together.

## Remaining gates

- Durable production session store.
- Real authenticated HTTPS endpoint.
- Real executable provider adapter.
- End-to-end QA/Audit evidence.
- Production CORS/CSRF configuration validated in deployment.

## Protected assets

`INDICE_MAESTRO_v007` and protected Knowledge OS are untouched.
