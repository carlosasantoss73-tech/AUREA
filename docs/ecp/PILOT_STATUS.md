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
| Composición Gate compartido → pack ECP | IMPLEMENTADO / VALIDADO POR CI | `src/ecp/context-pipeline.ts` en rama de trabajo |
| Alcance del conocimiento ECP en Bibliotecario Universal | DOCUMENTADO | `docs/ecp/BIBLIOTECARIO_SCOPE.md`; no se creó segundo índice |
| Acceso live a Google Drive | VALIDADO EN LECTURA | Workflow #106 autenticó por WIF, descubrió 15 candidatos y descargó los bytes reales del índice vigente |
| Lectura del índice real de registros | VALIDADA EN MODO LECTURA | `INDICE_MAESTRO_v011.json` se descargó con `MediaIoBaseDownload`: 6.016 bytes, versión v011, estado VIGENTE, total declarado 45, 1 registro nuevo y cadena hasta v001; 45 IDs únicos recuperados al recorrer la cadena. La búsqueda en la cadena no encontró un registro de proyecto ECP |
| Registro efectivo de ECP en el índice maestro vigente | NO DEMOSTRADO | No se halló registro ECP. Preparar propuesta de incorporación y usar el flujo autorizado; no editar Drive directamente |
| Adaptador de ejecución ECP con inyección de contexto institucional | IMPLEMENTADO + PRUEBAS CI APROBADAS | `src/ecp/institutional-execution-adapter.ts`; PR #171 fusionada. En ruta ECP dedicada, exige pack institucional READY antes de llamar al proveedor; aún no está registrada en un deployment ECP. |
| Sonda live de Bibliotecario enfocada en ECP | VALIDADA LIVE — BLOQUEO REAL CONFIRMADO | Workflow run `37876540709`: autenticación WIF y lectura del índice v011 exitosas; prueba con `projectId: ecp` recuperó 0 registros aprobados y el Context Gate devolvió `BLOCKED` sin fallback. Vitest: 2 pruebas live pasaron. No es fallo de transporte: falta el registro ECP aprobado. |
| Conector live Bibliotecario → runtime | NO IMPLEMENTADO | `InstitutionalAuthorityReader` sigue siendo una interfaz; no existe implementación externa concreta conectada al runtime |
| Contexto recuperado entregado al modelo | ADAPTADOR IMPLEMENTADO; DEPLOYMENT NO INTEGRADO | `EcpInstitutionalExecutionAdapter` inyecta pack/citas cuando se registra en una ruta ECP dedicada; el worker actual sigue con provider vacío y no registra la ruta ECP |
| Segmentación de texto extraído con localizadores | IMPLEMENTADA + CI VALIDADO | PR #173 fusionada; conserva documento/versión/localizador y bloquea truncado silencioso. No extrae texto del archivo original. |
| Ingestión de PDF/Excel/OCR y archivos grandes | NO VALIDADA | El chunker no es parser. Endpoint HTTP revisado es JSON y tiene límite de cuerpo de 16.384 bytes |
| Auditoría real de ofertas originales | NO VALIDADA | La biblioteca no devolvió los originales de las tres ofertas en las búsquedas efectuadas |
| Piloto ECP completo | **NO OPERATIVO** | Faltan recuperación live de registros, conexión al runtime, ingesta y caso real con evidencia primaria |

## RESULT → EVIDENCE → DECISION → LEARNING → ADAPTATION → NEXT ACTION

- **RESULT:** el gate ECP, el pack con citas, el pipeline de composición, el adaptador de inyección de contexto institucional y el segmentador de evidencia extraída están en main; la inyección solo se activa al registrar el adaptador en una ruta ECP dedicada.
- ****EVIDENCE:** PR #169 fusionado tras CI exitoso; PR #170 tiene typecheck y suite P0 aprobados en run #731. Workflow Knowledge OS #106 autenticó por WIF y descargó el contenido real del índice: v011, VIGENTE, 45 registros declarados, cadena de 11 índices desde v011 hasta v001 y 45 IDs únicos recolectados.
- **DECISION:** reutilizar Universal AI Librarian con un ámbito de proyecto `ecp`; no crear un segundo Bibliotecario ni declarar operación completa.
- **LEARNING:** autenticación real no equivale a recuperación de registros. Hay que identificar el archivo/estructura que contiene los registros del índice y el mecanismo de consulta autorizado.
- **ADAPTATION:** el pipeline ECP falla de forma cerrada ante recuperación vacía, proyecto incorrecto, citas locales o metadatos incompletos. Mantener separación entre evidencia primaria, continuidad heredada y aprendizaje documentado.
- **NEXT ACTION:** (1) registrar ECP mediante el flujo autorizado del Bibliotecario, sin editar el índice manualmente; (2) conectar el adaptador de ejecución ya probado a una ruta de runtime ECP dedicada; (3) implementar/validar ingesta por lotes de PDF/Excel y referencias a páginas; (4) ejecutar evaluación con los originales del expediente y Red Team.

## Condiciones para declarar OPERATIVO

Solo cambiar a OPERATIVO tras demostrar de forma reproducible:
1. lectura del índice maestro vigente y recuperación autorizada por proyecto;
2. cada hecho institucional con fuente, documento, versión y localizador verificable;
3. entrega del contexto al modelo en runtime, con bloqueo si la recuperación falla;
4. inventario completo de archivos y páginas/hojas, con tratamiento de documentos grandes;
5. matriz por requisito y oferente sobre expediente original;
6. pruebas de contradicción, convalidación, documento ilegible, capacidad nueva y ausencia de fuentes;
7. Red Team sin recomendación de adjudicación.
