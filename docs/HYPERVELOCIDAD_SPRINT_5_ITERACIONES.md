# AUREA — Sprint de Hipervelocidad y Calidad V1

## Propósito

Convertir el avance actual de AUREA desde una cadena de contratos y gates hacia un ciclo operativo integrado, ejecutable, verificable, recuperable y con aprendizaje.

Este documento NO reemplaza el Documento Maestro ni `INDICE_MAESTRO_v007`. Es una capa operativa de ejecución y coordinación.

## Regla de trabajo

Cada frente se trata como una Work Cell. Los frentes independientes pueden ejecutarse en paralelo; los que tengan dependencia fuerte permanecen secuenciales.

Cada ciclo obligatorio:

`Objetivo → Análisis → Implementación → Prueba → Evidencia → QA → Auditoría → Aprendizaje → Adaptación futura → Cierre`

No se acepta como terminado simplemente porque exista código. Debe distinguirse:

`DOCUMENTADO / IMPLEMENTADO / INTEGRADO / VALIDADO / OPERATIVO`

## Protocolo de panel experto

Cuando una Work Cell sea ejecutada por una IA/proveedor, el prompt debe pedir cinco perspectivas internas antes de recomendar cambios:

1. **Arquitecto:** coherencia con la arquitectura existente y reutilización.
2. **Implementador:** diseño mínimo, mantenible y compatible con TypeScript/ESM.
3. **QA adversarial:** casos límite, regresiones, falsos positivos y falsos negativos.
4. **Seguridad/Gobernanza:** autoridad, permisos, aislamiento, fail-closed y reversibilidad.
5. **Auditor:** evidencia verificable, trazabilidad y diferencia entre hecho, inferencia y propuesta.

La respuesta final del proveedor debe consolidar las cinco perspectivas; no debe presentar opiniones como hechos.

## Prompt maestro para cada IA/proveedor

> Actúa como especialista senior dentro de una Work Cell de AUREA. No inventes archivos, APIs, proveedores, integraciones ni capacidades. Antes de proponer código, inspecciona los contratos existentes y reutilízalos. Identifica explícitamente qué YA EXISTE, qué EXISTE PARCIALMENTE y qué DEBE ADAPTARSE. No dupliques responsabilidades ya resueltas. Mantén compatibilidad con TypeScript estricto y ESM. No rompas contratos existentes. Toda decisión debe incluir: problema, evidencia, supuestos, alternativas, riesgos, recomendación, cambios mínimos, pruebas y criterio de aceptación. Ejecuta mentalmente cinco revisiones: arquitectura, implementación, QA adversarial, seguridad/gobernanza y auditoría. Si falta información, bloquea o pide evidencia; no la inventes. Después de cada resultado, captura buenas prácticas, aprendizaje, prevención de regresiones y adaptación reutilizable para futuras Work Cells.

---

# ITERACIÓN 1 — EJECUCIÓN REAL CONTROLADA

### Objetivo
Cerrar la brecha principal actual: `RuntimeAdmission` admite una Work Cell, pero explícitamente NO ejecuta herramientas/proveedores. fileciteturn162file0L2-L2

### Work Cells paralelas
- C1.1 Execution Contract
- C1.2 Provider Adapter Execution
- C1.3 Result/Evidence Envelope
- C1.4 Adversarial QA
- C1.5 Execution Telemetry

### Prompt específico
> Diseña e implementa el mínimo contrato de ejecución real de AUREA posterior a `RuntimeAdmission`. Debe aceptar una admisión autorizada, ejecutar mediante un adapter explícito, devolver resultado estructurado, evidencia, traceId, provider/model, tiempos, estado y errores. Debe fallar cerrado si falta adapter, capability, autorización o evidencia mínima. No debe modificar `runtime-admission.ts`; crea contratos nuevos si es posible. Reutiliza `ProviderRuntimeAdapter`, `ExecutionGateResult`, Work Cell y Permission Gateway. Diferencia selección de proveedor de ejecución real. Incluye pruebas para éxito, provider no ejecutable, adapter ausente, error del provider, resultado sin evidencia y reintento seguro.

### Aceptación
- Existe un contrato de executor desacoplado del provider.
- Una ejecución autorizada produce resultado + evidencia + telemetría.
- Una ejecución no autorizada no llega al adapter.
- Error del proveedor no se transforma en éxito.
- No se inventan resultados.

---

# ITERACIÓN 2 — VERIFICACIÓN, QA Y AUDITORÍA DE RESULTADOS

### Objetivo
Pasar de "ejecuté" a "puedo demostrar que el resultado es válido".

### Work Cells paralelas
- C2.1 Result Validator
- C2.2 Evidence Validator
- C2.3 QA Result Contract
- C2.4 Audit Evidence Contract
- C2.5 Adversarial/Regression QA

### Prompt específico
> Construye la capa de verificación posterior a la ejecución. No reemplaces `QAAuditGate`; extiéndelo mediante contratos nuevos. La validación debe comparar objetivo, ejecución, resultado, evidencia y restricciones. Debe distinguir PASS, FAIL y BLOCKED cuando corresponda. Un resultado exitoso técnicamente no equivale automáticamente a resultado correcto. Detecta evidencia insuficiente, contradicciones, incumplimiento de restricciones, output vacío o no verificable. Produce un paquete auditable que pueda alimentar el cierre de Work Cell.

### Aceptación
- Resultado técnico y resultado válido son conceptos separados.
- QA puede rechazar una ejecución aparentemente exitosa.
- Auditoría exige evidencia.
- El cierre sigue pasando por `QAAuditGate`.

---

# ITERACIÓN 3 — PERSISTENCIA, CONTINUIDAD Y RECUPERACIÓN

### Objetivo
Eliminar la dependencia de memoria efímera para estado operacional crítico.

### Work Cells paralelas
- C3.1 Work State Persistence Contract
- C3.2 Execution/Event Ledger
- C3.3 Resume/Recovery
- C3.4 Knowledge/Context Continuity
- C3.5 Recovery QA

### Prompt específico
> Diseña la persistencia mínima para Work Cells, checkpoints, eventos de ejecución, evidencia y decisiones sin alterar el Knowledge OS protegido. Revisa `OperationsCenter`, `OperationsCheckpoint`, Work Cell, Health Ledger y Context Retrieval. No reemplaces componentes existentes: crea interfaces/adapters de persistencia. Debe ser posible cerrar una sesión y recuperar el estado exacto de una Work Cell, saber qué ocurrió, qué quedó pendiente, qué evidencia existe y cuál es la siguiente acción. Debe evitar doble ejecución después de recuperación mediante idempotencia o claves de ejecución.

### Aceptación
- Estado crítico no depende exclusivamente de memoria del proceso.
- Resume conserva contexto operacional y evidencia.
- Se detecta ejecución duplicada.
- Recuperación es auditable.

---

# ITERACIÓN 4 — CICLO AUTÓNOMO OPERATIVO

### Objetivo
Integrar objetivo → planificación → admisión → ejecución → verificación → aprendizaje → siguiente acción.

### Work Cells paralelas
- C4.1 Autonomy Controller Integration
- C4.2 Planner/Work Cell Coordinator
- C4.3 Sentinel Lifecycle
- C4.4 Learning/Prevention
- C4.5 End-to-End QA

### Prompt específico
> Integra los contratos existentes de `AutonomyCycle`, `RuntimeAdmission`, Work Cell, Sentinel, QA/Audit y Operations en un controlador de ciclo operativo. No confundas transición de estado con ejecución autónoma real. Cada transición debe tener evento, evidencia y autoridad. El ciclo debe bloquearse cuando falte contexto, proveedor, permiso, aprobación, evidencia o QA. Después de una ejecución debe registrar aprendizaje y preparar la siguiente acción solo si las condiciones lo permiten. No permitas que un LLM se autoautorice cambios de arquitectura, políticas o permisos.

### Aceptación
- Existe una ruta end-to-end trazable.
- Cada etapa tiene gate.
- Fallos producen bloqueo/escalamiento, no falsos éxitos.
- Learning no modifica políticas críticas sin autorización.

---

# ITERACIÓN 5 — ESCALA HOLDING + ECOSISTEMA MULTIEMPRESA

### Objetivo
Convertir el kernel operativo en una plataforma capaz de sostener Holding + múltiples empresas + múltiples células sin perder aislamiento ni gobernanza.

### Work Cells paralelas
- C5.1 Organizational Authority Profiles
- C5.2 Agent Registry/Assignment
- C5.3 Company Context Isolation
- C5.4 Holding/Company Sentinel Federation
- C5.5 Global Workboard/Health
- C5.6 Multi-company End-to-End QA

### Prompt específico
> Evoluciona el kernel actual hacia una organización multiempresa. Revisa `OrganizationalRegistry`, Permission Gateway, Work Cell, Context Retrieval, Sentinel y Operations. Implementa únicamente las extensiones necesarias: perfiles de autoridad, herencia de scope controlada, asignación de agentes, aislamiento de contexto y tablero global. Mantén el principio de mínimo privilegio. Una empresa no puede leer o actuar sobre otra por simple disponibilidad técnica. Diferencia autoridad, capacidad y asignación. Toda acción cross-company requiere scope explícito y autorización.

### Aceptación
- Holding y compañías tienen scopes diferenciados.
- Agentes tienen responsabilidad y autoridad trazables.
- No hay fuga de contexto entre compañías.
- El tablero global muestra estado sin destruir aislamiento.
- Sentinel Holding y Sentinels de compañía pueden correlacionar incidentes sin asumir autoridad indebida.

---

# ORDEN DE INTEGRACIÓN

Aunque las cinco iteraciones se planifican como macrofrentes, no todo puede ejecutarse simultáneamente.

Paralelización segura:
- Diseño/contratos/QA pueden avanzar en paralelo cuando no modifican el mismo contrato.
- Implementación de ejecución debe preceder la integración end-to-end.
- Verificación puede diseñarse en paralelo con ejecución, pero su integración depende del contrato de resultados.
- Persistencia puede diseñarse en paralelo con ejecución y QA.
- Autonomía depende de ejecución + verificación + continuidad.
- Escala Holding depende de que el ciclo operacional sea estable.

## Criterio de velocidad

La velocidad de AUREA no se mide por cantidad de commits sino por **distancia reducida entre objetivo y resultado operativo verificable sin aumentar el riesgo**.

## Criterio anti-regresión

Cada Work Cell debe entregar:

1. Resultado.
2. Evidencia.
3. Decisión.
4. Próxima acción.
5. Buenas prácticas capturadas.
6. Correcciones/aprendizajes.
7. Adaptación reutilizable.
8. Pruebas nuevas o ampliadas.
9. Riesgos residuales.
10. Estado: DOCUMENTADO / IMPLEMENTADO / INTEGRADO / VALIDADO / OPERATIVO.

## Regla de protección

Este sprint no autoriza mover, renombrar, borrar, sobrescribir ni reemplazar archivos protegidos. Las nuevas capacidades deben preferir nuevos módulos/adapters/tests. Cualquier modificación destructiva o de contrato existente requiere autorización explícita.
