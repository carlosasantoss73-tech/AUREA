# AUREA B14 — Automatic Context Retrieval

## Objetivo

Eliminar la dependencia de la memoria local del agente cuando una solicitud depende de trabajo histórico o continuidad.

## Regla

Si la consulta contiene señales como `esta semana`, `ayer`, `lo que hicimos`, `anteriormente`, `continuemos` o equivalentes, AUREA debe consultar primero el Context Retrieval Gate.

La recuperación se gobierna como READ mediante `knowledge.read` + `knowledge.search`, respetando `projectId`, allowlists y trazabilidad.

Si existe evidencia, se crea un Context Pack efímero y se inyecta al payload del Runtime. Si no existe evidencia, la ejecución se bloquea con `CONTEXT_REQUIRED_BUT_NOT_FOUND` en lugar de inventar continuidad.

## Lo que B14 deja implementado

- detección automática de continuidad;
- autorización de recuperación como READ;
- aislamiento por proyecto;
- inyección de contexto en Runtime;
- bloqueo ante ausencia de evidencia;
- pruebas del Gate y de integración Runtime;
- Technology Radar histórico B11 persistido como registro de candidatos;
- proveedor determinista del Radar para recuperar candidatos de video/voz con citas.

## Evidencia histórica preservada

El B11 documentó los candidatos MoneyPrinterTurbo, OmniVoice / OmniVoice Studio, Hermes Agent, Agent-Reach, Creati.ai y Created.ai / CreatAI.io. Sus estados se conservan como `DISCOVERED`; ninguno se marca integrado sin licencia, seguridad, API/runtime y pruebas verificadas.

## Límite que no se oculta

El repositorio actual AUREA P0 no contiene todavía el backend completo del Knowledge OS histórico (DB/Drizzle/tRPC) que fue verificado en el proyecto anterior. La documentación histórica confirma que `server/bibliotecario.ts` implementaba recuperación y Context Packs, pero también confirma que la memoria transversal automática y la ingesta de conversaciones no estaban implementadas en ese P0.

Por tanto B14 implementa el **contrato y la barrera automática**, además de una fuente durable de continuidad del Technology Radar, pero no declara falsa una conexión a conversaciones de ChatGPT que no existe dentro de este runtime.

## Criterio para cerrar B14 como operativo end-to-end

Debe conectarse `ContextProvider` al Knowledge OS persistido/fuente histórica real y ejecutarse una prueba de caja negra:

`"¿Qué herramientas de video trabajamos esta semana?"`

sin que el usuario diga `recupera memoria`, devolviendo nombres, estado, evidencia y citas. Si no hay evidencia, debe declarar `NO CONSTA` y no completar por memoria del modelo.
