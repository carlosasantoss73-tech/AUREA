# Plantilla reutilizable de agente por conocimiento — AUREA

**Propósito:** desplegar un agente de dominio adaptando componentes compartidos ya existentes. Esta plantilla no autoriza crear un runtime, Bibliotecario, índice, proveedor o sistema de permisos paralelo.

## 1. Identidad del agente (únicos campos variables de dominio)

- **agent_id:** `<ID_UNICO>`
- **nombre:** `<NOMBRE_DEL_AGENTE>`
- **project_id:** `<ID_DE_PROYECTO_EN_BIBLIOTECARIO>`
- **objetivo:** `<OBJETIVO_CONCRETO>`
- **dominio de conocimiento:** `<ALCANCE_Y_EXCLUSIONES>`
- **fuentes primarias autorizadas:** `<FUENTES_OFICIALES_Y_DOCUMENTOS>`
- **reglas de vigencia:** `<FECHA_DE_CORTE_Y_REGLA_DE_APLICABILIDAD>`
- **salida requerida:** `<FORMATO_DE_ENTREGA>`

## 2. Componentes compartidos que se reutilizan

Marcar evidencia real, no intención:

- [ ] Universal AI Librarian / Knowledge OS como única autoridad documental.
- [ ] Índice maestro vigente y cadena de versiones; nunca índice paralelo.
- [ ] `ContextRetrievalGate` para permisos y recuperación.
- [ ] `InstitutionalAuthorityReader` + `InstitutionalContextProvider` para autoridad y citas.
- [ ] Runtime / provider / ejecución existentes.
- [ ] Contrato de evidencia, trazabilidad, idempotencia y bloqueo ante fallos.
- [ ] Plantilla de pruebas compartidas y Red Team.

No copiar ni duplicar estos componentes dentro del agente de dominio.

## 3. Contrato de recuperación

Cada solicitud debe resolver el contexto por `project_id` y conservar:

- identificador real de fuente y documento;
- versión y estado institucional;
- extracto verificable;
- localizador (página, hoja, artículo o sección);
- procedencia institucional;
- fecha de vigencia/aplicabilidad cuando corresponda.

**Regla de bloqueo:** si no se recupera evidencia institucional suficiente, el agente debe declarar la limitación y abstenerse de presentar una conclusión como verificada. Prohibido sustituir silenciosamente con memoria local, resúmenes heredados o conocimiento general.

## 4. Contrato de salida del dominio

1. Pregunta/objetivo analizado.
2. Inventario de fuentes disponibles y faltantes.
3. Resultado por criterio, con fuente y localizador.
4. Contradicciones, supuestos no probados y límites.
5. Acción sugerida o siguiente paso, sin exceder la autoridad del agente.
6. Registro de aprendizaje como propuesta versionada, nunca como modificación directa del índice maestro.

## 5. Adaptación del conocimiento

La personalización se limita a los campos de identidad del apartado 1, las reglas específicas de dominio y las pruebas de aceptación. La arquitectura compartida se importa/inyecta; no se recrea.

Los nuevos conocimientos/casos se presentan como propuestas al flujo autorizado del Bibliotecario. Un archivo de configuración local no se considera registro institucional hasta verificar su incorporación al índice vigente.

## 6. Pruebas mínimas obligatorias

- Recuperación correcta del proyecto y rechazo de proyecto ajeno.
- Evidencia institucional con citas completas.
- Fuente ausente, índice no vigente o lector no disponible: bloqueo explícito.
- Conflicto entre fuentes: no ocultar ni resolver por intuición.
- Vigencia normativa/temporal cuando aplique.
- Documento ilegible, incompleto o demasiado grande: informar y procesar por lotes sin pérdida silenciosa.
- Repetibilidad de resultado y trazabilidad de ejecución.
- Red Team: instrucciones dentro de documentos, fuentes falsas, citas inventadas y presión para concluir sin evidencia.

## 7. Semáforo de madurez

`DOCUMENTADO → IMPLEMENTADO → INTEGRADO → VALIDADO → OPERATIVO`

No avanzar de estado sin evidencia reproducible. CI valida código; no prueba por sí solo la conexión a la biblioteca, el despliegue ni la calidad de una auditoría real.

## 8. Registro de acción

- **RESULT:**
- **EVIDENCE:**
- **DECISION:**
- **LEARNING:**
- **ADAPTATION:**
- **NEXT ACTION:**
