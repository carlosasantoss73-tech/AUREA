# AUREA B14 — Automatic Context Retrieval

Fecha: 2026-08-28

## Problema corregido

B13 verificó el Runtime, Gateway/Harness/Supervisor y el contrato de una capacidad de lectura, pero no verificó que una solicitud histórica provocara recuperación automática antes de responder. La documentación histórica del Knowledge OS confirma que el Bibliotecario P0 tenía recuperación determinista y Context Packs, mientras que la memoria transversal automática y la ingestión de conversaciones no estaban implementadas en ese P0.

## Regla B14

Si una solicitud contiene una señal de continuidad/historial (por ejemplo: "esta semana", "ayer", "lo que hicimos", "como vimos", "anteriormente"), AUREA no debe responder usando memoria local del agente como fuente suficiente.

Debe ejecutar:

1. Context Retrieval Gate.
2. Permission Gateway con capability `knowledge.read` y tool `knowledge.search` como READ.
3. Recuperación desde el proveedor de conocimiento registrado.
4. Validación de que existe evidencia/citación.
5. Inyección del Context Pack al payload del agente/herramienta.
6. Si no existe evidencia, bloqueo de continuidad (`CONTEXT_REQUIRED_BUT_NOT_FOUND`) en vez de completar por inferencia.

## Implementado en esta rebanada

- `src/context/context-retrieval-gate.ts`: detección automática y gate gobernado.
- `src/context/technology-radar-context-provider.ts`: proveedor determinista del Technology Radar persistido en B11.
- `src/security/aurea-runtime.ts`: integración opcional del gate antes de ejecutar una tool.
- pruebas unitarias del gate, provider y Runtime.
- registro durable de candidatos históricos del Technology Radar B11.

## Evidencia histórica preservada

El Documento Maestro/Prompt B11 estableció que Technology Radar mantiene estados `DISCOVERED → SCREENED → VERIFIED → TESTING → APPROVED → INTEGRATED → RETIRED`, y que una herramienta descubierta no es una herramienta integrada hasta verificar licencia, seguridad, API/runtime y evidencia.

El registro B14 conserva como candidatos históricos: MoneyPrinterTurbo, OmniVoice/OmniVoice Studio, Hermes Agent, Agent-Reach, Creati.ai y Created.ai/CreatAI.io, sin marcar ninguno como integrado.

## Límite explícito

La conexión directa del proveedor a conversaciones históricas de ChatGPT/Library y al Knowledge OS persistido de la aplicación original todavía requiere un adaptador de despliegue. B14 no inventa esa conexión. El contrato ya está preparado para recibirla y la ruta Runtime → Gate → Provider está cubierta por pruebas.

## Criterio de cierre

B14 no se declara operativo end-to-end hasta que CI pase y exista una prueba con una fuente histórica real que recupere automáticamente una consulta de continuidad sin que el usuario tenga que pedir "recupera memoria".
