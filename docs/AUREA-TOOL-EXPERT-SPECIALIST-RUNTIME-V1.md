# AUREA — TOOL EXPERT SPECIALIST RUNTIME V1

## RESULTADO
Adds the execution/verification bridge between the generic Tool Expert Factory contracts and a concrete specialist adapter.

## DECISIÓN
Use one reusable runtime for specialist execution:
1. official-source preflight;
2. execute through the specialist adapter;
3. require identity/trace consistency;
4. require evidence for EXECUTED;
5. audit the result;
6. verify only through an explicit transition with authoritative post-state evidence;
7. fail closed on adapter/runtime errors.

No specialist may skip the runtime to claim EXECUTED or VERIFIED.

## STATUS MODEL
READY -> EXECUTED -> VERIFIED
or
READY -> BLOCKED

VERIFIED requires authoritative verification evidence. Execution evidence alone does not establish verified post-state.

## NEXT INTEGRATION
Bind AUREA-GEMINI-EXPERT-V1 to this runtime and exercise one real read-only execution, one controlled adapter failure, and one explicit verification record.

No new architecture is introduced.
