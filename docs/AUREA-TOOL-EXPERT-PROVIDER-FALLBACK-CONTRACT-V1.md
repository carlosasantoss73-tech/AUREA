# AUREA — TOOL EXPERT PROVIDER / FALLBACK CONTRACT V1

## RESULTADO
Defines the provider-neutral contract for multi-model Tool Experts without claiming any external provider is connected.

## DECISIÓN
A provider is executable only when:
1. it is explicitly marked executable by the runtime; and
2. current health evidence exists.

Fallback is deterministic:
- preserve candidate order;
- do not execute candidates blocked by missing health evidence;
- invoke the next candidate only after a real failure/empty output from the current candidate;
- preserve every attempt in the execution result;
- fail closed when no candidate succeeds.

## THREE-MODEL SCOPE
The contract can represent Gemini, Claude and ChatGPT as provider identities, but registration is not connectivity. Each real provider still requires its own current official-source gate, adapter, credential/permission evidence, live health check, live execution and audit evidence.

## CURRENT STATUS
CONTRACT IMPLEMENTED / LIVE MULTI-PROVIDER NOT CLAIMED.

This is C06/C07 work in the 15-cell Tool Expert Factory cycle.
