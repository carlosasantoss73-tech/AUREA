# Auditoría comparativa de agentes AUREA — SP EXÁMENES, RADAR y módulos existentes

Fecha de revisión: 2026-10-19  
Repositorio revisado: `carlosasantoss73-tech/AUREA`, rama `main`.  
Alcance: comparación de archivos y contratos disponibles en el repositorio. La operación diaria de RADAR se considera reportada por el usuario, pero no se encontró una implementación identificable de ese agente en el árbol de archivos revisado; no se confunde con el registro interno `technology-radar.registry.ts`, que cataloga tecnologías candidatas y no demuestra búsqueda diaria en redes sociales.

## Resumen ejecutivo

La mejor estrategia no es copiar SP EXÁMENES literalmente ni crear otro runtime. El repositorio ya contiene piezas más generales y, en algunos aspectos, más maduras que SP: `apps/tool_expert_factory/runtime.py` aporta contrato de ejecución, preflight, evidencia, auditoría y verificación con autoridad institucional; `src/ecp/*` aporta ingesta documental con hashes/localizadores, gates y composición de contexto. SP aporta un patrón de producto ligero y útil para consultas en vivo, con interfaz de texto/imagen, fuentes oficiales concurrentes y fallback de proveedores.

**Recomendación:** consolidar un contrato de ejecución común sin borrar ni migrar de golpe los agentes que funcionan. Cada agente debe conservar su adaptador de dominio y su política específica. El Bibliotecario sigue siendo la única autoridad institucional.

## Comparación basada en evidencia del repositorio

| Agente/módulo | Evidencia encontrada | Lo reutilizable | Brecha / estado que no debe sobredeclararse |
|---|---|---|---|
| SP EXÁMENES | `apps/sp-examenes/worker.ts`, `README.md`, workflow de smoke/deploy | Interfaz sencilla, validación de entrada, consulta concurrente de fuentes oficiales, PDF/imágenes para Gemini, contrato de respuesta con citas, fallback opcional, latencia total | La prueba reciente reportó ~65 s en texto y falló la imagen de prueba 1×1. No hay medición por etapa. El smoke de imagen debe usar un archivo real válido. El código leído no prueba conexión al Bibliotecario. |
| RADAR (búsqueda diaria en redes) | El usuario informa que está funcionando; no se encontró un agente de redes con nombre RADAR ni workflow diario en el árbol AUREA revisado. Sí existe `src/technology/technology-radar.registry.ts`, que es un catálogo de tecnologías, no el agente de escucha social. | Tomar como referencia operativa el ciclo diario que ya usa: fuentes, captura, deduplicación, ranking, resumen, enlaces y aprendizaje, una vez inspeccionado su runtime real. | No comparar internals, proveedores, redes, cron ni métricas hasta encontrar el repositorio, workflow o artefacto real de RADAR. Estado: reportado operativo por el usuario; implementación no localizada en este repo. |
| Tool Expert Factory / Specialist Runtime | `apps/tool_expert_factory/runtime.py`, `contracts.py`, `super_agent.py`, `work_cells.py`, `work_planner.py`, pruebas unitarias | Contratos de solicitud/resultado, identidad de traza, preflight, estados READY/BLOCKED/EXECUTED/VERIFIED, registro de auditoría, verificación que exige evidencia autoritativa, ejecución por células y planificador | Es una base más apropiada para el núcleo común que duplicar el worker SP. El adaptador institucional necesita la fuente real; una prueba de código no equivale a operación de cada agente. |
| ECP IA | `src/ecp/context-pipeline.ts`, `evidence-gate.ts`, `document-extractor.ts`, `document-ingestion.ts`, `register-google-drive-ecp-execution.ts`, `docs/ecp/PILOT_STATUS.md` | Extracción PDF/XLSX, SHA-256, localizadores, gate de evidencia, aislamiento de expedientes, composición con lector institucional | El estado documentado reporta 0 registros ECP aprobados en el índice v011 en la última prueba conocida; la composición bloqueó antes de invocar el proveedor. No declarar piloto ECP operativo hasta tener conocimiento institucional aprobado, runtime desplegado y prueba E2E con expediente real. |
| Agente de publicación / redes | `apps/publication-agent/agent.py`, `tiktok_api.py`, `tiktok_oauth.py`, `tiktok_review.py` y tests | Separación diagnóstico/plan/aprobación/ejecución/verificación; no inventar accesos; publicación con aprobación humana | El agente base devuelve `adapter_not_connected` al inspeccionar el estado genérico; sus herramientas de planificación no prueban publicación en vivo. No equivale al RADAR de escucha diaria. |
| Conchita / shell personal | `apps/conchita-pilot/README.md`, `src/conchita-cloudflare-worker.ts`, gateway, sesiones y stores durables | Cliente ligero, gateway cloud, sesiones autenticadas, control de mensajes y persistencia de resultados | El README dice que la dependencia crítica es el Gateway seguro y que la UI falla cerrada sin él. Verificar despliegue/runtime antes de declarar operatividad. |
| Bibliotecario / Knowledge OS | `src/ecp/register-google-drive-ecp-execution.ts`, `docs/ecp/BIBLIOTECARIO_CONNECTOR_GAP.md`, workflows WIF | Autoridad institucional, lector de solo lectura, índice/versionado, trazabilidad y fail-closed | Los documentos históricos tienen cortes distintos; el estado más reciente debe comprobarse en workflows live. Nunca sustituir el índice por semillas locales ni asumir que un descriptor equivale al índice de registros. |

## Arquitectura común recomendada

No fusionar todos los workers en una sola aplicación todavía. Establecer un contrato compartido con estas capas:

1. **Adaptador del dominio**: SP, RADAR, ECP, encuestas, publicación, XOLAR/Conchita. Define entrada/salida y políticas propias.
2. **Admisión y seguridad**: validación de datos, autenticación, límites, privacidad y permisos de mutación.
3. **Planificador/orquestador**: utiliza los contratos ya presentes en Tool Expert Factory; no duplica Work Planner/Work Cells.
4. **Recuperación de evidencia**: recuperación en paralelo con origen, timestamp, URL, hash/versión/localizador y estado explícito.
5. **Autoridad institucional**: Bibliotecario en solo lectura; el agente no promueve ni inventa conocimiento institucional.
6. **Ejecución de proveedor**: adaptadores de proveedor independientes, timeout, clasificación de errores y fallback trazable.
7. **Gate de salida**: cada dominio aplica su criterio de evidencia; si no se sostiene la respuesta, marca NO CONCLUYENTE/BLOCKED/POR VALIDAR.
8. **Observabilidad**: tiempos por etapa, fuente, proveedor, resultado, fallos y coste/uso, sin registrar secretos ni contenido sensible innecesario.
9. **Auditoría y aprendizaje**: RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN.

## Diferencias que conviene preservar

- **SP EXÁMENES** prioriza interacción rápida de pregunta/respuesta, lectura de imagen y citas oficiales.
- **RADAR** debe priorizar tareas programadas, cobertura de fuentes, deduplicación, señales nuevas, relevancia y enlaces de origen. No necesita heredar la interfaz de examen.
- **ECP** debe priorizar trazabilidad documental, evidencia de ofertas, reglas legales y bloqueo cuando falte el conocimiento institucional autorizado.
- **Encuestas** debe priorizar conteo exacto, extracción tabular, localizadores por PDF/página y conciliación manual.
- **Publicación** requiere aprobación humana antes de publicar o gastar.
- **Conchita/XOLAR** requieren identidad, sesiones, privacidad y control de ejecución.

## Brechas transversales que se deben comprobar

1. **Bibliotecario real**: identificar evidencia live vigente de lectura de registros, no solo health/descriptor de archivo.
2. **Latencia**: SP ya expone latencia total; agregar métricas por etapa antes de optimizar el proveedor.
3. **Imagen y PDF**: separar pruebas de fixture, integración y archivo real; no concluir que la ruta funciona por un PNG de 1×1.
4. **Proveedor alternativo**: confirmar configuración real y ejecutar una prueba que provoque fallback; la existencia de código no demuestra secretos válidos ni fallback operativo.
5. **Programación diaria RADAR**: localizar workflow/cron y resultados recientes; registrar frescura, errores, duplicados y cobertura por fuente.
6. **Persistencia**: no depender de memoria de instancia para cuotas o estado global que requiera durabilidad.
7. **Evaluación**: crear conjuntos de regresión específicos por agente y un contrato compartido de observabilidad, sin mezclar sus métricas de calidad.

## Plan incremental

**P0 — Inventario verificable**
- Obtener el repositorio o artefacto de RADAR, su ejecución programada y una salida reciente.
- Verificar el último resultado de Bibliotecario/ECP y estado de workflows, sin modificar la fuente institucional.
- Registrar agentes con cinco estados separados: DOCUMENTADO, IMPLEMENTADO, VALIDADO EN TEST, VALIDADO EN VIVO, OPERATIVO.

**P1 — No romper lo que funciona**
- Congelar cambios funcionales de SP antes del examen; permitir únicamente pruebas de regresión y observabilidad segura.
- Mantener RADAR en su runtime actual hasta completar comparación de evidencia.

**P2 — Consolidar, no duplicar**
- Definir tipos comunes para solicitud, evidencia, intento de proveedor, resultado, trazabilidad y estado.
- Reusar SpecialistRuntime, gates, auditoría y Work Cells donde encajen, a través de adaptadores; no copiar esos módulos dentro de cada agente.

**P3 — ECP**
- Resolver incorporación institucional aprobada de conocimiento ECP por procedimiento autorizado.
- Integrar el contexto institucional al runtime desplegado y ejecutar un expediente real con fuentes citables.

**P4 — Encuestas y RADAR**
- Para encuestas, añadir pipeline de extracción/conteo exacto y Excel validado.
- Para RADAR, medir calidad de captura, duplicados, frescura, fallos y utilidad de alertas antes de cambiar su arquitectura.

## RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN

- **RESULTADO:** comparación inicial de los módulos de agente que sí aparecen en el repositorio.
- **EVIDENCIA:** archivos citados en cada fila; árbol recursivo de `main` revisado el 19-oct-2026.
- **DECISIÓN:** usar Tool Expert Factory como candidato al núcleo común y SP como patrón de interacción/retrieval, sin imponer una sola implementación a todos.
- **APRENDIZAJE:** el repositorio ya contiene componentes compartibles; copiar SP literalmente duplicaría capacidades y no resolvería por sí solo el gate institucional.
- **ADAPTACIÓN:** mantener adaptadores y políticas por dominio; integrar solo tras pruebas.
- **SIGUIENTE ACCIÓN:** localizar el runtime real de RADAR y revisar una ejecución diaria reciente; después ajustar esta matriz con evidencia operativa real y priorizar el primer cambio de código compartido.
