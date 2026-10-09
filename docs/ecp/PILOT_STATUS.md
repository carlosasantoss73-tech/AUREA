# ECP IA — estado del piloto

Corte: 08-oct-2026 (hora Ecuador). Este archivo distingue estado documental de operación real.

## Semáforo por dimensión

| Dimensión | Estado | Evidencia |
|---|---|---|
| Contrato de comportamiento ECP | DOCUMENTADO | `docs/ecp/AGENT_CONTRACT.md` |
| Prompt maestro reutilizable | DOCUMENTADO | `docs/ecp/PROMPT_MAESTRO_ECP.md` |
| Continuidad del proceso actual | DOCUMENTADO (heredado) | `docs/ecp/LICS-CNELEP-2026-073-continuity.md` |
| Gate determinístico de evidencia | IMPLEMENTADO | `src/ecp/evidence-gate.ts` |
| Pruebas del gate ECP | VALIDADO | 11 pruebas ECP pasan en CI |
| Suite del repositorio en la ejecución revisada | VALIDADO | 76 archivos de prueba pasan, 2 omitidos; 228 pruebas pasan, 3 omitidas |
| Typecheck de la ejecución revisada | VALIDADO | Paso Typecheck finalizado con éxito |
| Conector real al Bibliotecario | NO IMPLEMENTADO / BLOQUEO P0 | `src/context/institutional-context-provider.ts` define una interfaz, pero no contiene conector externo |
| Recuperación del contexto en el Worker de chat | BLOQUEADO | `src/conchita-cloudflare-worker.ts` tiene un proveedor que devuelve `citations: []` y `facts: []` |
| Paso del contexto recuperado al proveedor de IA | BLOQUEADO | `src/conchita-runtime-bridge.ts` envía solo `message` y `mode` a la ejecución |
| Ingestión de ofertas PDF/Excel/OCR | NO VALIDADA | El endpoint HTTP revisado acepta JSON y limita el cuerpo a 16.384 bytes |
| Auditoría real de las tres ofertas con citas a página | NO VALIDADA | No se localizaron los archivos originales en la biblioteca; el enlace oficial SOCE expiró por timeout en esta ejecución |
| Piloto ECP operativo de punta a punta | **NO OPERATIVO** | Faltan recuperación institucional, ingestión y prueba con expediente original |

## RESULT → EVIDENCE → DECISION → LEARNING → ADAPTATION → NEXT ACTION

- **RESULT:** se agregó una primera capa ECP de clasificación conservadora y se incorporó a main.
- **EVIDENCE:** 11 pruebas específicas ECP y la ejecución CI revisada aprobaron; la suite reportó 228 pruebas aprobadas y 3 omitidas, con typecheck aprobado.
- **DECISION:** no declarar ECP operativo solo por superar pruebas unitarias.
- **LEARNING:** la arquitectura tiene contratos reutilizables para contexto institucional, pero no está demostrado el conector real al Bibliotecario ni el traspaso de citas al modelo.
- **ADAPTATION:** mantener el gate ECP fail-closed; no crear un índice local paralelo ni usar la nota de continuidad como evidencia primaria.
- **NEXT ACTION:** (1) recuperar o recibir resolución de inicio, pliego/TDR, aclaraciones y ofertas originales; (2) identificar e implementar el adaptador real del Bibliotecario conforme al contrato institucional existente; (3) pasar citas/contexto recuperados al proveedor; (4) habilitar ingestión por lotes con referencia a archivo/página/hoja; (5) ejecutar el caso completo y Red Team.

## Condición para declarar piloto listo
Solo cambiar a OPERATIVO después de demostrar en una ejecución reproducible que ECP:
1. lee el expediente original completo o declara de forma explícita todo archivo faltante;
2. recupera contexto institucional autorizado con procedencia y localizadores;
3. produce matriz por requisito y oferente sin inventar páginas ni estados;
4. supera pruebas de contradicción, documento ilegible, convalidación y capacidad nueva;
5. genera un informe revisado por Red Team sin recomendar adjudicación.
