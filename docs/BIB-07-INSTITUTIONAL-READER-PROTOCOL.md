# BIB-07 — Institutional Reader / v011 Authority Protocol

## Status
IMPLEMENTATION CONTRACT — not a claim that a live Drive adapter exists.

## Verified institutional source
- Repository: AUREA_KNOWLEDGE_LIBRARY
- Current index: INDICE_MAESTRO_v011.json
- Current index fileId: 1kIzswJSMKzQOpf8z6j8iDvfxhq26ZvXa
- Previous index: INDICE_MAESTRO_v010.json
- Previous index fileId: 19YHMHdlpD-yKA1HK-zyUszVzDhNldkHx
- v011 contains 45 records according to the independent Drive audit.
- v011 is the highest indexed version; no v012 was verified in that audit.

## Resolution rules
1. Read the current index from the institutional repository.
2. Require the current index to be the highest valid version in 00_CONTROL.
3. Follow the previous-index reference and verify file identity.
4. Preserve the traversed chain for provenance.
5. Scope records by projectId before returning context.
6. Promote only records whose institutional state is VIGENTE or APROBADO.
7. Never promote INFERENCIA, PENDIENTE, NO_VERIFICADO, or historical/replaced records as current context.
8. If the current index cannot be verified, fail closed.
9. If institutional evidence is absent, do not use AUREA local seeds as a substitute.
10. A real Drive/Google authenticated adapter must be added separately; this document does not claim that adapter exists.

## Evidence boundary
The repository evidence verifies the v011 identity, version chain, and documented governance rules. It does not provide the complete raw v011 JSON payload inside this code repository. Therefore no parser is permitted to assume undocumented v011 fields.

## Target E2E
"Quiero continuar con Terrazas Costa Limón"
→ institutional authority resolution
→ v011
→ TCL-scoped records
→ provenance
→ ContextProvider
→ Runtime
→ block if institutional evidence is unavailable.

## Explicit non-claims
DOCUMENTED != IMPLEMENTED != INTEGRATED != VALIDATED != OPERATIONAL.
