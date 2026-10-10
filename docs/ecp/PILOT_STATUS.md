# ECP IA — estado del piloto

Corte: 10-oct-2026. Estado documental separado de operación real.

Actualización técnica: PR #184 (corrección de autorización de lectura) y PR #178 (pruebas del adaptador registrado) fusionadas; PR #186 fusionada con la composición `GoogleDriveInstitutionalReader → ContextProvider → ContextRetrievalGate → ECP adapter`. CI P0 y typecheck pasaron para la composición. PR #185 incorporó `docs/agent-factory/PLANTILLA_MAESTRA_ADAPTACION_AGENTE.md`. La prueba live de PR #188 también pasó: autenticó por WIF, leyó el índice v011 real y verificó 3 pruebas (lector, Context Gate y composición ECP). Resultado: 0 registros ECP aprobados; la composición bloqueó antes de llamar al proveedor. La validación de seguridad sí está demostrada; el piloto funcional con conocimiento ECP aprobado todavía no.

Última actualización de continuidad: PR #175 fusionada en `main` (commit `bee1133f70c10f3f4ba5d8d611b0c919024eaa62`; workflow AUREA Cloud Continuity run `37879263548` terminó `success`). El paquete AKL-046 existe en el repositorio como propuesta y borrador de acta; esto NO demuestra que se haya escrito en Drive ni cambia el índice institucional vigente.

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
| Composición lector Google Drive → Context Gate → adaptador ECP | IMPLEMENTADA / VALIDADA CI + LIVE | `src/ecp/register-google-drive-ecp-execution.ts`, PR #186 fusionada; prueba live #117, 3/3 pruebas pasaron. Con cero registros ECP aprobados, el proveedor no fue invocado. |
| Alcance del conocimiento ECP en Bibliotecario Universal | DOCUMENTADO | `docs/ecp/BIBLIOTECARIO_SCOPE.md`; no se creó segundo índice |
| Acceso live a Google Drive | VALIDADO EN LECTURA | Workflow #106 autenticó por WIF, descubrió 15 candidatos y descargó los bytes reales del índice vigente |
| Lectura del índice real de registros | VALIDADA EN MODO LECTURA | `INDICE_MAESTRO_v011.json` se descargó con `MediaIoBaseDownload`: 6.016 bytes, versión v011, estado VIGENTE, total declarado 45, 1 registro nuevo y cadena hasta v001; 45 IDs únicos recuperados al recorrer la cadena. La búsqueda en la cadena no encontró un registro de proyecto ECP |
| Paquete de propuesta AKL-046 en repositorio | DOCUMENTADO / PROPUESTA | PR #175 fusionada; `docs/ecp/ECP_AGENTE_CONTRATACION_PUBLICA_ECUADOR_v1.md` y `docs/ecp/BORRADOR_ACTA_INCORPORACION_AKL-046.md`. No equivalen a archivos institucionales en Drive. |
| Registro efectivo de ECP en el índice maestro vigente | BLOQUEADO POR PERMISOS DRIVE | Preflight live #118: `AKL-046` ausente en la cadena v011→v001 y no existe aún el documento propuesto en Drive. La carpeta institucional `03_AGENTES` reporta `canAddChildren=false` y `canEdit=false` para la identidad del workflow; además, el workflow usa scope OAuth `drive.readonly`. No hay escritura institucional disponible con la identidad actual. |
| Adaptador de ejecución ECP con inyección de contexto institucional | IMPLEMENTADO + PRUEBAS CI APROBADAS | `src/ecp/institutional-execution-adapter.ts`; PR #171 fusionada. En ruta ECP dedicada, exige pack institucional READY antes de llamar al proveedor; aún no está registrada en un deployment ECP. |
| Sonda live de Bibliotecario enfocada en ECP | VALIDADA LIVE — BLOQUEO ESPERADO | Workflow run #117 (`38024638997`): WIF y lectura de v011 exitosas; 3/3 pruebas live pasaron. `projectId: ecp` recuperó 0 registros aprobados; Context Gate `BLOCKED`; composición `PASS_FAIL_CLOSED`; `PROVIDER_CALLS: 0`. No es fallo de transporte: falta el registro ECP aprobado. |
| Composición lector Bibliotecario → contexto ECP → adaptador | IMPLEMENTADA + CI VALIDADO | `src/ecp/register-google-drive-ecp-execution.ts`; PR #186 fusionada. Compone el lector real existente, el proveedor institucional, el gate y el adaptador ECP; requiere token autorizado e ID de índice verificado en el entorno que la invoque. |
| Contexto recuperado entregado al modelo | COMPOSICIÓN DISPONIBLE; DEPLOYMENT NO INTEGRADO | La nueva función registra el adaptador ECP en un runtime dedicado cuando se invoca; el worker de Conchita sigue con proveedor de contexto vacío y no registra una ruta ECP de producción. |
| Segmentación de texto extraído con localizadores | IMPLEMENTADA + CI VALIDADO | PR #173 fusionada; conserva documento/versión/localizador y bloquea truncado silencioso. No extrae texto del archivo original. |
| Extracción e ingesta local PDF/XLSX con trazabilidad | IMPLEMENTADA + CI VALIDADO | `src/ecp/document-extractor.ts` + `src/ecp/document-ingestion.ts`; SHA-256 como versión de origen, localizadores por página/hoja/fila preservados en chunks, límites y fail-closed. PR #192 y PR #196 fusionadas; P0/typecheck/tests aprobados. OCR, XLS legado, originales del expediente e integración al runtime siguen pendientes. |
| Auditoría real de ofertas originales | NO VALIDADA | La biblioteca no devolvió los originales de las tres ofertas en las búsquedas efectuadas |
| Piloto ECP completo | **NO OPERATIVO** | La composición de código está fusionada y pasa CI, pero la sonda live sigue recuperando 0 registros aprobados `ecp`; faltan incorporación institucional autorizada, ruta/runtime desplegado, ingesta de documentos originales y prueba de extremo a extremo con expediente real. |

## RESULT → EVIDENCE → DECISION → LEARNING → ADAPTATION → NEXT ACTION

- **RESULT:** el gate ECP, el pack con citas, el pipeline de composición, el adaptador de inyección de contexto institucional y el segmentador de evidencia extraída están en main; la inyección solo se activa al registrar el adaptador en una ruta ECP dedicada.
- **EVIDENCE:**** PR #169 fusionado tras CI exitoso; PR #170 tiene typecheck y suite P0 aprobados en run #731. Workflow Knowledge OS #117 autenticó por WIF y descargó el contenido real del índice: v011, VIGENTE, 45 registros declarados, cadena de 11 índices desde v011 hasta v001 y 45 IDs únicos recolectados; 3/3 pruebas live confirmaron el bloqueo seguro por ausencia de registro ECP.
- **DECISION:** reutilizar Universal AI Librarian con un ámbito de proyecto `ecp`; no crear un segundo Bibliotecario ni declarar operación completa.
- **LEARNING:** autenticación real no equivale a recuperación de registros. Hay que identificar el archivo/estructura que contiene los registros del índice y el mecanismo de consulta autorizado.
- **ADAPTATION:** el pipeline ECP falla de forma cerrada ante recuperación vacía, proyecto incorrecto, citas locales o metadatos incompletos. Mantener separación entre evidencia primaria, continuidad heredada y aprendizaje documentado.
- **NEXT ACTION:** (1) resolver el permiso de escritura institucional: la identidad actual no puede agregar archivos a `03_AGENTES` (`canAddChildren=false`) y usa `drive.readonly`; obtener autorización de administrador para un flujo de mínimo privilegio antes de crear el documento o v012; (2) ejecutar el procedimiento AKL-046: crear el archivo institucional en `03_AGENTES`, completar ficha/acta, crear `INDICE_MAESTRO_v012.json` sin sobrescribir v011 y releer para verificar; (3) conectar el adaptador de ejecución a una ruta ECP dedicada con proveedor institucional real; (4) integrar `document-ingestion.ts` en una ruta ECP dedicada; probar los originales del expediente, archivos grandes y OCR por una vía explícita; mantener bloqueo ante documentos sin texto; (5) evaluar con ofertas originales y Red Team.

## Intervención requerida del usuario

No se requiere una acción en el plan ChatGPT Plus ni comprar otra suscripción. El bloqueo externo es la ausencia de un mecanismo de escritura autorizado a Google Drive en el flujo disponible: la conexión de GitHub puede leer el estado del repositorio y los workflows, pero el acceso institucional probado está limitado a `drive.readonly`. Cuando el administrador del flujo habilite escritura con mínimo privilegio en las carpetas necesarias (`03_AGENTES` y `00_CONTROL`/`ACTAS`), el procedimiento debe verificar permisos y escribir solo nuevos archivos/versiones; nunca sobrescribir v011. No se deben compartir claves privadas ni secretos en el chat.

## Condiciones para declarar OPERATIVO

Solo cambiar a OPERATIVO tras demostrar de forma reproducible:
1. lectura del índice maestro vigente y recuperación autorizada por proyecto;
2. cada hecho institucional con fuente, documento, versión y localizador verificable;
3. entrega del contexto al modelo en runtime, con bloqueo si la recuperación falla;
4. inventario completo de archivos y páginas/hojas, con tratamiento de documentos grandes;
5. matriz por requisito y oferente sobre expediente original;
6. pruebas de contradicción, convalidación, documento ilegible, capacidad nueva y ausencia de fuentes;
7. Red Team sin recomendación de adjudicación.
