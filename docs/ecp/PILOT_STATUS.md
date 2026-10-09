# ECP IA — estado del piloto

Corte: 09-oct-2026. Estado documental separado de operación real.

## Semáforo por dimensión

| Dimensión | Estado | Evidencia |
|---|---|---|
| Contrato de comportamiento ECP | DOCUMENTADO | `docs/ecp/AGENT_CONTRACT.md` |
| Prompt maestro reutilizable | DOCUMENTADO | `docs/ecp/PROMPT_MAESTRO_ECP.md` |
| Continuidad LICS-CNELEP-2026-073 | DOCUMENTADA / HEREDADA | `docs/ecp/LICS-CNELEP-2026-073-continuity.md`; no reemplaza ofertas originales |
| Gate determinístico de evidencia | IMPLEMENTADO | `src/ecp/evidence-gate.ts` |
| Pruebas del gate | VALIDADO | 11 pruebas ECP; suite previa y typecheck aprobados |
| Pack de contexto con citas | IMPLEMENTADO / VALIDADO POR CI | PR #169 fusionado; constructor bloquea citas incompletas y fuentes locales |
| Adaptador de autoridad al límite de búsqueda institucional | IMPLEMENTADO / VALIDADO POR CI | PR #169 fusionado; todavía depende de un lector concreto |
| Composición Gate compartido → pack ECP | IMPLEMENTADO / CI PENDIENTE | `src/ecp/context-pipeline.ts` en rama de trabajo |
| Alcance del conocimiento ECP en Bibliotecario Universal | DOCUMENTADO | `docs/ecp/BIBLIOTECARIO_SCOPE.md`; no se creó segundo índice |
| Acceso live a Google Drive | PARCIALMENTE VALIDADO | Workflows #99 y #100 autentican por WIF y leen el descriptor configurado |
| Lectura del índice real de registros y búsqueda por proyecto | NO DEMOSTRADA / BLOQUEO P0 | El archivo `INDICE_MAESTRO_v011.json` leído contiene 133 bytes y solo claves id, kind, mimeType, name; no es el contenido del índice consultable |
| Registro efectivo de ECP en el índice maestro vigente | NO DEMOSTRADO | No modificar el índice de Drive desde este cambio; falta identificar el flujo autorizado |
| Conector live Bibliotecario → runtime | NO IMPLEMENTADO | `InstitutionalAuthorityReader` sigue siendo una interfaz; no existe implementación externa concreta conectada al runtime |
| Contexto recuperado entregado al modelo | BLOQUEADO | `src/conchita-runtime-bridge.ts` pasa solo message/mode; el worker mantiene provider vacío |
| Ingestión de PDF/Excel/OCR y archivos grandes | NO VALIDADA | Endpoint HTTP revisado es JSON y tiene límite de cuerpo de 16.384 bytes |
| Auditoría real de ofertas originales | NO VALIDADA | La biblioteca no devolvió los originales de las tres ofertas en las búsquedas efectuadas |
| Piloto ECP completo | **NO OPERATIVO** | Faltan recuperación live de registros, conexión al runtime, ingesta y caso real con evidencia primaria |

## RESULT → EVIDENCE → DECISION → LEARNING → ADAPTATION → NEXT ACTION

- **RESULT:** el gate ECP y el pack con citas están en main; se añadió un adaptador reutilizable al contrato de autoridad y ahora se compone el Gate compartido con el pack ECP en una rama posterior.
- **EVIDENCE:** PR #169 fusionado tras CI exitoso; workflows de Knowledge OS #99 y #100 completaron la lectura del descriptor por WIF. El resultado observado es un descriptor JSON de 133 bytes, no registros consultables.
- **DECISION:** reutilizar Universal AI Librarian con un ámbito de proyecto `ecp`; no crear un segundo Bibliotecario ni declarar operación completa.
- **LEARNING:** autenticación real no equivale a recuperación de registros. Hay que identificar el archivo/estructura que contiene los registros del índice y el mecanismo de consulta autorizado.
- **ADAPTATION:** el pipeline ECP falla de forma cerrada ante recuperación vacía, proyecto incorrecto, citas locales o metadatos incompletos. Mantener separación entre evidencia primaria, continuidad heredada y aprendizaje documentado.
- **NEXT ACTION:** (1) validar CI del pipeline; (2) localizar en Drive el descriptor y el índice de registros correctos mediante la identidad de lectura ya configurada; (3) implementar el lector real sin modificar Knowledge OS; (4) conectar recuperación y citas al runtime ECP; (5) resolver ingesta por lotes; (6) ejecutar caso original y Red Team.

## Condiciones para declarar OPERATIVO

Solo cambiar a OPERATIVO tras demostrar de forma reproducible:
1. lectura del índice maestro vigente y recuperación autorizada por proyecto;
2. cada hecho institucional con fuente, documento, versión y localizador verificable;
3. entrega del contexto al modelo en runtime, con bloqueo si la recuperación falla;
4. inventario completo de archivos y páginas/hojas, con tratamiento de documentos grandes;
5. matriz por requisito y oferente sobre expediente original;
6. pruebas de contradicción, convalidación, documento ilegible, capacidad nueva y ausencia de fuentes;
7. Red Team sin recomendación de adjudicación.
