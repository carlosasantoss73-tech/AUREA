# Arquitectura reutilizable de agentes — patrón SP EXÁMENES

Estado: **propuesta técnica basada en código existente; no es todavía un componente común implementado**.  
Base observada: `apps/sp-examenes/worker.ts` en `main`, consultado el 19-oct-2026.  
Regla institucional: el Bibliotecario/Knowledge OS sigue siendo la única autoridad para conocimiento institucional. Este documento no sustituye ni reconstruye su índice.

## 1. Qué ya demuestra SP EXÁMENES

El worker actual implementa:
- Entrada HTTP validada y límites de tamaño/tasa.
- Recuperación concurrente de páginas oficiales, con estado de disponibilidad y fecha de consulta.
- Descarga paralela de PDF oficiales y envío al proveedor principal Gemini.
- Instrucciones de respuesta que exigen evidencia, fuentes y abstención cuando no se puede verificar.
- Fallback de modelo Gemini y fallback opcional a OpenAI/Azure si sus secretos existen.
- Metadatos de respuesta como fuentes, estado de fuentes y latencia total.

Límites observados:
- La secuencia de proveedores es mayoritariamente secuencial y puede acumular latencia.
- Los PDF se envían a Gemini, pero no a los proveedores alternativos; el fallback debe declarar esta limitación.
- La limitación por IP/global usa memoria del worker y no constituye cuota durable distribuida.
- La ruta `/health` solo demuestra que el proceso responde, no que Bibliotecario, proveedores, recuperación o respuestas estén operativos.
- El smoke test de imagen no debe usar una imagen de 1×1 como prueba concluyente de imágenes reales.

## 2. Patrón reutilizable objetivo

```text
Interfaz / API del agente
        |
        v
Adaptador de dominio (SP, ECP, encuestas, XOLAR)
        |
        v
Orquestador común
  |       |         |
  |       |         +--> Telemetría por etapa / límites / trazabilidad
  |       +------------> Proveedores (principal + fallback explícito)
  +--------------------> Recuperación concurrente de fuentes
                            |
                            +--> Bibliotecario / Knowledge OS (autoridad institucional)
                            +--> Fuentes oficiales externas autorizadas
        |
        v
Puerta de evidencia y política del dominio
        |
        v
Respuesta estructurada + citas/localizadores + estado + latencia
```

Este diagrama define una meta de diseño. No afirma que el orquestador común o la conexión universal al Bibliotecario ya estén implementados.

## 3. Contrato mínimo de cada solicitud

- `requestId`: identificador correlacionable.
- `domain`: agente/módulo especializado.
- `question` y archivos admitidos.
- `knowledgeContext`: resultados recuperados del Bibliotecario, con identificador/hash/versión/localizador cuando estén disponibles.
- `externalSources[]`: URL, título, fecha, resultado de recuperación y extracto verificable.
- `evidenceStatus`: complete / partial / unavailable; no convertir un fallo de lectura en ausencia de evidencia.
- `providerTrace[]`: proveedor/modelo, duración, resultado y motivo de fallback; nunca incluir secretos.
- `answer`, `citations[]`, `confidence` y `limitations[]`.
- `latencyMs` total y tiempos por etapa.

No declarar conocimiento institucional como consultado si no hay evidencia verificable de lectura del Bibliotecario.

## 4. Puertas obligatorias

1. **Admisión:** validar formato, tamaño, tipo de archivo y autenticación si corresponde.
2. **Contexto institucional:** consultar el Bibliotecario autorizado en modo de solo lectura; conservar versión/hash/localizador. Si no hay acceso, declarar el bloqueo.
3. **Fuentes oficiales:** recuperar en paralelo únicamente las fuentes pertinentes y registrar qué se pudo leer.
4. **Proveedor:** tiempo límite por intento, clasificación de errores y fallback explícito; no reintentar errores permanentes.
5. **Evidencia:** responder solo lo que sostengan las fuentes recuperadas; abstenerse o marcar POR VALIDAR si falta evidencia.
6. **Salida:** respuesta, fuentes, limitaciones, estado de evidencia y latencia.
7. **Prueba:** separar unitarias, integración, smoke de despliegue y validación humana de contenido real.
8. **Observabilidad:** medir por etapa; no atribuir el retraso a un componente sin telemetría.

## 5. Adaptación priorizada a los pendientes

| Módulo | Reutilizar del patrón SP | Adaptación indispensable | Primera puerta de aceptación |
|---|---|---|---|
| ECP IA / guía SP para contratación pública | Recuperación concurrente, fuentes trazables, proveedor con timeout/fallback, respuesta estructurada | Bibliotecario como única fuente institucional; expediente por cliente aislado; hashes/versiones/localizadores; gate de registros ECP aprobados; matriz CUMPLE / NO CUMPLE / CONVALIDAR / POR VALIDAR; no inventar incumplimientos | Un expediente de prueba con fuentes reales autorizadas y resultado reproducible; si el índice no contiene registros ECP aprobados, bloquear análisis sustantivo y reportar el motivo |
| Agente de encuestas CNEL | Ingesta de archivos, validación, trazabilidad, procesamiento por lotes y reporte de errores | Extracción OCR/PDF, evidencia visible por encuesta, reglas institucionales, no estimar datos faltantes, conciliación de conteos y exportación Excel | Un lote pequeño de PDFs contrastado manualmente, con recuento exacto y cero imputaciones inventadas |
| AUREA / Bibliotecario | Contrato de recuperación, versionado, hashes, localizadores y estados explícitos | Mantener índice institucional como autoridad; demostrar lectura real autorizada; distinguir probe/documentación de operación | Prueba live de solo lectura que devuelva documento, versión/hash y localizador correctos |
| XOLAR | Entrada validada, orquestación, telemetría, pruebas y fallback controlado | Definir su propia política de seguridad, privacidad y escalamiento; no heredar reglas de examen o contratación; no afirmar prevención/detección eficaz sin evaluación | Build + health + prueba funcional end-to-end con casos autorizados y criterios de falsos positivos/negativos |

## 6. Trabajo técnico recomendado (sin rehacer SP)

**Fase A — estabilizar el patrón:** instrumentar tiempos por etapa en SP y corregir la prueba de imagen para usar una imagen PNG/JPEG válida no degenerada. No cambiar la política de respuestas que actualmente está dando resultados correctos sin un test de regresión.

**Fase B — extraer el contrato común:** crear tipos compartidos para `EvidenceSource`, `KnowledgeRecordRef`, `ProviderAttempt`, `AgentAnswer` y `EvidenceStatus`. No mover aún lógica de producción hasta que las pruebas demuestren equivalencia.

**Fase C — aplicar primero a ECP:** conectar el adaptador de dominio al runtime existente y al Bibliotecario de solo lectura. La ausencia de registros ECP aprobados debe ser un bloqueo explícito, no una invitación a reconstruir conocimiento.

**Fase D — aplicar al agente de encuestas:** añadir el adaptador de extracción/validación tabular y una prueba de conteo exacto antes de generar el Excel final.

**Fase E — XOLAR:** abordar después de verificar su estado de build/health y definir criterios de seguridad propios.

## 7. Definiciones de estado para informes

- **DOCUMENTADO:** existe especificación o documento.
- **IMPLEMENTADO:** existe código en el repositorio.
- **VALIDADO EN TEST:** pruebas automatizadas pasan.
- **VALIDADO EN VIVO:** una prueba real demuestra el comportamiento en el entorno desplegado.
- **OPERATIVO:** validación en vivo repetible, dependencias reales disponibles y criterios funcionales cumplidos.

No elevar un estado a partir de otro por inferencia.

## 8. Resultado / evidencia / decisión / aprendizaje / adaptación / siguiente acción

- **RESULTADO:** identificado un patrón reutilizable en el worker SP EXÁMENES y creada esta propuesta en una rama aislada.
- **EVIDENCIA:** `apps/sp-examenes/worker.ts`; contiene recuperación oficial concurrente, PDF, fallback de modelos/proveedores, política de abstención y latencia total.
- **DECISIÓN:** conservar SP funcionando y extraer gradualmente contratos comunes; no reconstruir AUREA ni duplicar el Bibliotecario.
- **APRENDIZAJE:** la arquitectura de recuperación y respuesta es reutilizable, pero los adaptadores, gates institucionales, seguridad y formatos de salida deben permanecer específicos por dominio.
- **ADAPTACIÓN:** ECP primero, luego encuestas, después XOLAR; Bibliotecario transversal solo mediante acceso real autorizado.
- **SIGUIENTE ACCIÓN:** validar el contenido de este patrón con las pruebas actuales y abrir cambios de código pequeños por módulo, empezando por telemetría SP y el gate de conocimiento ECP.

## 9. Límites conocidos

Este documento no demuestra que el Bibliotecario esté conectado en vivo, que los proveedores alternativos estén configurados, que el OCR esté implementado ni que ECP tenga registros institucionales aprobados. Esos puntos requieren pruebas independientes con evidencia.
