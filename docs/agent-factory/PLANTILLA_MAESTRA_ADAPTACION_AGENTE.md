# Plantilla maestra — Adaptación de agentes AUREA

**Propósito:** crear un agente especializado reutilizando la infraestructura AUREA existente. Esta plantilla configura el dominio y sus fuentes; no autoriza reconstruir, duplicar, desplegar ni modificar sistemas institucionales.

> **Regla de oro:** primero inspeccionar y reutilizar. No declarar implementado, integrado, validado ni operativo sin evidencia verificable.

## 0. Ficha de adaptación

- **Nombre del agente:** `[NOMBRE]`
- **Dominio / tarea:** `[DOMINIO]`
- **Versión de esta configuración:** `[VERSIÓN]`
- **Responsable funcional:** `[ROL]`
- **Repositorio / rama / commit base:** `[URL, RAMA, SHA]`
- **Fuente institucional autorizada:** `[BIBLIOTECARIO / KNOWLEDGE OS / OTRA]`
- **Identificador lógico del ámbito:** `[PROJECT_ID]`
- **Fecha de corte y entorno de prueba:** `[FECHA / ENTORNO]`
- **Resultado que debe demostrar el piloto:** `[RESULTADO OBSERVABLE]`

## 1. Puerta de continuidad obligatoria

Antes de cambiar código o conocimiento:

1. Recuperar el documento maestro, el prompt de continuidad, las decisiones aprobadas y los pendientes.
2. Inspeccionar el repositorio y los componentes existentes; registrar rama, commit y estado de PR/workflows.
3. Identificar contratos, runtime, proveedor, herramientas, recuperación, persistencia, seguridad y pruebas ya disponibles.
4. Distinguir evidencia del repositorio, evidencia live y afirmaciones heredadas del chat.
5. Registrar los bloqueos reales y la mínima ruta para el piloto.

**Prohibido:** reconstruir AUREA, crear un segundo Bibliotecario o índice, duplicar componentes existentes, inventar estados, asumir que CI demuestra integración live, exponer secretos o escribir en fuentes institucionales fuera del flujo autorizado.

## 2. Matriz de reutilización

Completar con rutas/IDs verificables; no dejar solo afirmaciones genéricas.

| Capacidad común | Componente existente / ruta | Estado comprobado | ¿Se reutiliza? | Cambio mínimo necesario | Evidencia |
|---|---|---|---|---|---|
| Contrato de agente | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[PRUEBA/URL]` |
| Bibliotecario / Knowledge OS | `[RUTA/ID]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Recuperación y Context Pack | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Gate de evidencia / trazabilidad | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Runtime / adaptador de proveedor | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Ingesta y segmentación | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Registro, persistencia y recuperación | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |
| Seguridad, límites y observabilidad | `[RUTA]` | `[ESTADO]` | Sí/No | `[CAMBIO]` | `[EVIDENCIA]` |

## 3. Paquete de conocimiento del dominio

El dominio se configura **encima de las capacidades comunes**. No se crea infraestructura paralela.

- **Fuentes primarias autorizadas:** `[FUENTES, URL/ID, RESPONSABLE]`
- **Jerarquía de autoridad:** `[ORDEN DE PRELACIÓN]`
- **Vigencia / versionado:** `[REGLA TEMPORAL]`
- **Metadatos mínimos:** fuente, título, versión, estado, fecha aplicable, identificador, localizador, procedencia y huella si está disponible.
- **Esquema de conocimiento / taxonomía:** `[CATEGORÍAS Y CAMPOS]`
- **Reglas de recuperación:** solo registros autorizados; citas con localizadores; sin sustitutos locales silenciosos.
- **Política de actualización:** propuestas versionadas; incorporación por el flujo institucional autorizado; no editar directamente el índice maestro.
- **Datos de prueba permitidos:** `[CASOS Y ARCHIVOS]`
- **Datos/acciones excluidos:** `[LÍMITES]`

## 4. Contrato del agente especializado

- **Objetivo principal:** `[OBJETIVO]`
- **Entradas válidas:** `[ENTRADAS]`
- **Salidas esperadas y esquema:** `[SALIDAS]`
- **Herramientas permitidas:** `[HERRAMIENTAS]`
- **Acciones que nunca puede realizar:** `[PROHIBICIONES]`
- **Tratamiento de incertidumbre:** bloquear o declarar `NO CONCLUYENTE` cuando falte evidencia crítica; explicar exactamente qué falta.
- **Citas y procedencia:** cada afirmación material debe vincularse con fuente y localizador verificable.
- **Revisión humana obligatoria:** `[DECISIONES/UMBRAL]`
- **Criterios de éxito medibles:** `[MÉTRICAS Y UMBRALES]`

## 5. Pruebas mínimas antes del piloto

| ID | Prueba | Resultado exigido | Evidencia |
|---|---|---|---|
| T01 | Recuperación desde la fuente autorizada | Fuente real, versión y ámbito identificados | `[LOG/ID]` |
| T02 | Cita válida | Fuente y localizador verificables | `[CASO]` |
| T03 | Contexto ausente/no autorizado | Bloqueo seguro; no llamar al proveedor cuando así lo exija el contrato | `[CASO]` |
| T04 | Documento incompleto, grande o ilegible | Declarar cobertura real; no fingir extracción completa | `[CASO]` |
| T05 | Contradicción entre fuentes | Mostrar conflicto y aplicar jerarquía autorizada o bloquear | `[CASO]` |
| T06 | Regresión del dominio | Mismos criterios ante entradas equivalentes | `[SUITE]` |
| T07 | Evaluación de errores | Falsos positivos/negativos revisados | `[RED TEAM]` |
| T08 | Flujo de punta a punta | Entrada → recuperación → ejecución → salida trazable | `[RUN ID / LOG]` |

## 6. Puertas de estado — no saltar niveles

- **DOCUMENTADO:** contrato y decisiones están registrados.
- **IMPLEMENTADO:** código o configuración existe en una rama/commit identificable.
- **INTEGRADO:** la ruta real conecta recuperación, contexto, proveedor y salida.
- **VALIDADO:** pruebas reproducibles aprobadas con evidencia.
- **LIVE VALIDADO:** una ejecución real confirma la conexión externa y el alcance autorizado.
- **PILOTO COMPLETADO:** caso representativo de principio a fin, cobertura y métricas revisadas, limitaciones registradas y responsable humano acepta el resultado.
- **OPERATIVO:** además del piloto, despliegue, seguridad, observabilidad, recuperación y procedimiento de mantenimiento comprobados.

CI verde por sí solo no demuestra LIVE VALIDADO, PILOTO COMPLETADO ni OPERATIVO.

## 7. Plan mínimo de adaptación

1. **Inspeccionar:** inventario del sistema actual, pruebas y fuentes.
2. **Mapear:** completar matriz de reutilización y listar brechas comprobadas.
3. **Configurar conocimiento:** preparar el paquete de dominio y solicitar incorporación por el flujo autorizado.
4. **Adaptar:** cambiar únicamente contrato, mapeos, prompts/configuración y conectores estrictamente necesarios.
5. **Probar:** ejecutar T01–T08; conservar logs, citas, conteos y fallos.
6. **Pilotar:** ejecutar un caso real autorizado y medir criterios de éxito.
7. **Cerrar:** actualizar estado, riesgos, manual de operación y siguiente acción.

No avanzar a una puerta posterior mientras una dependencia crítica esté bloqueada; documentar la dependencia y trabajar en paralelo en tareas independientes.

## 8. Registro obligatorio por acción

Para cada acción de ingeniería o conocimiento, anotar:

- **RESULTADO:** qué cambió o qué se comprobó.
- **EVIDENCIA:** commit/PR, workflow, log, ID de fuente, cita o resultado de prueba.
- **DECISIÓN:** qué se acepta, rechaza o mantiene bloqueado.
- **APRENDIZAJE:** qué reveló la prueba.
- **ADAPTACIÓN:** cambio mínimo derivado.
- **SIGUIENTE ACCIÓN:** tarea concreta, responsable y dependencia.

## 9. Resumen de cierre

- Estado por puerta: `[DOCUMENTADO / IMPLEMENTADO / INTEGRADO / VALIDADO / LIVE / PILOTO / OPERATIVO]`
- Pruebas aprobadas / totales: `[N/N]`
- Cobertura documental: `[CONTEO Y LÍMITES]`
- Bloqueos externos o humanos: `[LISTA]`
- Riesgos abiertos: `[LISTA]`
- Commit / PR / workflow: `[REFERENCIAS]`
- Decisión: `[CONTINUAR / PILOTO CONTROLADO / BLOQUEAR]`
- Próxima acción de mayor impacto: `[ACCIÓN]`

---

## Instrucción reutilizable para iniciar un agente nuevo

> Adapta un agente especializado sobre la arquitectura AUREA existente usando esta plantilla. No construyas desde cero. Inspecciona primero el repositorio, el contrato, las capacidades comunes y el estado real. Reutiliza Universal AI Librarian / Knowledge OS como única autoridad institucional. Integra solo el conocimiento de dominio autorizado. Haz el cambio mínimo, prueba cada puerta y aporta evidencia verificable. No declares éxito por documentación o CI aislados. No inventes estados ni escribas en sistemas institucionales fuera del flujo autorizado. Cierra cada acción con RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN.