# AUREA — PROMPT PACK DE CIERRE DEL BIBLIOTECARIO
Fecha: 2026-09-26
Objetivo: cerrar técnicamente la integración del Bibliotecario/Knowledge OS sin reconstruir AUREA ni duplicar su autoridad.

## 0. REGLAS INNEGOCIABLES PARA TODAS LAS IA

1. El Bibliotecario / Knowledge OS es la única autoridad institucional.
2. GitHub es fuente de código, historial y evidencia de implementación; NO es la autoridad institucional.
3. No reconstruyas, dupliques ni inventes el Bibliotecario, Knowledge OS, índices, estados, payloads, credenciales o registros.
4. No conviertas contratos, mocks, fixtures, stubs o workflows preparados en evidencia de integración real.
5. No marques PASS si no existe evidencia reproducible.
6. Si un dato no está demostrado, clasifícalo como PENDING/UNKNOWN/BLOCKED.
7. No expongas secretos, tokens, claves, IDs sensibles adicionales ni contenido institucional que no sea necesario.
8. Mantén separación estricta entre:
   contrato → autenticación → lectura real → parser → lector institucional → ContextProvider → gate → runtime → provider → verificación → auditoría.
9. La evidencia de proveedor externo no puede convertirse por sí sola en evidencia institucional.
10. Las células son unidades lógicas de trabajo paralelo; no son agentes independientes.
11. Toda modificación debe incluir: RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN.
12. Antes de modificar una interfaz existente, localizar sus consumidores y pruebas.
13. No cambiar la arquitectura global para resolver un bloqueo local.
14. Preferir recuperación de implementación histórica existente antes que reimplementación.
15. El cierre solo puede declararse cuando todas las condiciones de cierre de la auditoría estén demostradas.

## 1. ESTADO BASE

Auditoría formal: docs/AUDITORIA_CIERRE_BIBLIOTECARIO_2026-09-26.md

Bloqueadores principales:
- LIVE_READER no demostrado.
- AUTHENTICATION/WIF + lectura real no demostrado mediante una ejecución real.
- V011_PAYLOAD_VERIFIED no demostrado.
- INSTITUTIONAL_READER real no demostrado.
- RUNTIME_E2E Knowledge OS → ContextProvider → Runtime no demostrado.
- BLACK_BOX de aislamiento de fallback/local seed pendiente.
- VERIFICATION_IS_BIBLIOTECARIO_OWNED: la ruta institucional dedicada `verify_with_bibliotecario()` ya exige evidencia obtenida mediante `InstitutionalEvidenceProvider`; la prueba live de esta ruta aún depende de la integración real del Bibliotecario. El `verify()` genérico permanece deliberadamente disponible para verificaciones no institucionales.
- LOCAL_FALLBACK debe permanecer BLOCKED en institutionalOnly.
- Segundo proveedor/fallback no puede elevarse a autoridad institucional.

El workflow existente `.github/workflows/aurea-knowledge-os-v011-probe.yml` se ejecuta por push, pull_request y workflow_dispatch; usa Google WIF, lee el ID institucional v011, comprueba `canEdit=false`, descarga el contenido y valida JSON. Ya existe evidencia de ejecución real, pero el run más reciente se bloqueó en el preflight porque las variables WIF requeridas están vacías. Por tanto, la lectura real v011 continúa sin demostrarse.

## 2. PROMPT MAESTRO — CHATGPT PLUS / ORQUESTADOR

Actúa como Tech Lead de cierre de AUREA. Tu misión exclusiva es cerrar la integración real del Bibliotecario.

Trabaja sobre el repositorio actual y la auditoría vigente. No reconstruyas AUREA.

Ejecuta un plan paralelo con 15 células lógicas, respetando dependencias. Usa este orden de dependencia:
C01 → C02 → C03 → C04 para la cadena live reader;
las demás células pueden auditar, preparar pruebas y revisar contratos en paralelo.

Para cada célula:
- objetivo;
- archivos/commits inspeccionados;
- evidencia encontrada;
- cambios propuestos;
- pruebas necesarias;
- blockers;
- criterio de PASS;
- criterio de NO-GO.

No declares cierre hasta que:
LIVE_READER=PASS
AUTHENTICATION=PASS
V011_PAYLOAD_VERIFIED=PASS
INSTITUTIONAL_READER=PASS
RUNTIME_E2E=PASS
BLACK_BOX=PASS
VERIFICATION_IS_BIBLIOTECARIO_OWNED=PASS
LOCAL_FALLBACK=BLOCKED.

Prioridad absoluta: obtener evidencia real del Knowledge OS v011. Si una credencial o dispatch manual es indispensable, detén únicamente esa célula y deja todo lo demás avanzado.

## 3. PROMPT GEMINI — FORENSE DE KNOWLEDGE OS / V011

Audita únicamente la cadena GitHub Actions → Google WIF → Drive/Knowledge OS → índice v011.

No inventes payload.

Determina:
1. Qué variables/permissions necesita el workflow.
2. Si el workflow puede ejecutarse con la configuración actual.
3. Qué evidencia mínima debe producir.
4. Cómo comprobar de forma segura que el archivo leído es exactamente el índice institucional esperado.
5. Cómo comprobar que la lectura es read-only.
6. Cómo capturar el payload sin convertirlo en una fuente local de autoridad.
7. Qué cambios mínimos permitirían un run reproducible.
8. Qué blocker depende de una acción humana en GitHub/GCP.

Entrega comandos/cambios concretos y pruebas. No afirmes PASS sin run real.

## 4. PROMPT GEMINI — RECUPERACIÓN DEL LECTOR INSTITUCIONAL

Busca en el historial del repositorio toda implementación relacionada con:
BIB-01, BIB-02, BIB-03, BIB-05, BIB-06, BIB-08, Knowledge OS, Bibliotecario, institutional context, v011.

Compara implementación histórica contra HEAD actual.

Objetivo: recuperar una implementación existente si existe; no crear una segunda arquitectura.

Determina el camino mínimo:
Knowledge OS v011 → InstitutionalAuthorityReader → InstitutionalContextSource/ContextProvider → ContextRetrievalGate.

Entrega:
- archivos históricos relevantes;
- commits;
- código recuperable;
- diferencias con HEAD;
- patch mínimo;
- pruebas de regresión.

## 5. PROMPT PLUS — VERIFICACIÓN PROPIEDAD DEL BIBLIOTECARIO

Audita SpecialistRuntime.verify() y todos sus consumidores.

Problema a resolver:
la función actualmente puede aceptar Evidence(authoritative=True) sin demostrar que la evidencia proviene de InstitutionalEvidenceProvider/Bibliotecario.

Diseña el cambio mínimo que garantice:
- la ruta de cierre institucional requiere evidencia obtenida mediante el puerto institucional;
- evidencia de OpenAI, Browser Use, Playwright, Skyvern u otro proveedor nunca puede satisfacer por sí sola el cierre institucional;
- no se rompen los contratos legítimos de ejecución;
- tests existentes permanecen verdes o se actualizan justificadamente.

No hagas un refactor global.

## 6. PROMPT PLUS — BLACK BOX / FAIL CLOSED

Diseña y ejecuta pruebas black-box que demuestren:
A) un LOCAL_SEED no puede pasar institutionalOnly;
B) ausencia de provenance institucional bloquea;
C) evidencia externa authoritative=True sin origen Bibliotecario no cierra;
D) Bibliotecario real sí puede cerrar una verificación;
E) fallback de proveedor no puede convertirse en autoridad institucional;
F) cualquier error de lectura/authentication termina BLOCKED, nunca VERIFIED.

Entrega matriz de pruebas y evidencia reproducible.

## 7. PROMPT 15 CÉLULAS

C01 — Live WIF/Auth
Objetivo: ejecutar/probar autenticación GitHub→Google mediante WIF.
PASS: run real con autenticación exitosa.

C02 — Live v011 Reader
Objetivo: leer exactamente el índice v011 institucional.
PASS: metadata + content read + ID match + read-only confirmado.

C03 — V011 Payload
Objetivo: validar estructura real del payload.
PASS: parser basado en payload real, no inventado.

C04 — Institutional Reader
Objetivo: conectar payload real al InstitutionalAuthorityReader.
PASS: lectura institucional reproducible.

C05 — Context Provider
Objetivo: conectar reader con InstitutionalContextSource/Provider.
PASS: citas con provenance INSTITUTIONAL provenientes del reader real.

C06 — Retrieval Gate
Objetivo: validar institutionalOnly.
PASS: local/missing provenance bloquea; institucional real pasa.

C07 — SpecialistRuntime
Objetivo: conectar evidencia institucional al runtime.
PASS: ejecución y verificación con trace/identity correctos.

C08 — Bibliotecario-owned Verification
Objetivo: validar la ruta institucional dedicada de cierre.
PASS: `verify_with_bibliotecario()` obtiene evidencia exclusivamente mediante `InstitutionalEvidenceProvider`; evidencia de proveedor externo no puede cerrar esta ruta.

C09 — Black Box
Objetivo: probar aislamiento extremo.
PASS: ningún bypass local/external provider permite VERIFIED.

C10 — Provider/Fallback
Objetivo: OpenAI + browser/provider fallback.
PASS: ejecución puede usar proveedores, pero autoridad permanece institucional.

C11 — Regression Suite
Objetivo: ejecutar suite completa afectada.
PASS: tests relevantes verdes y cambios justificados.

C12 — Historical Recovery
Objetivo: comparar commits BIB históricos y recuperar solo implementación útil.
PASS: sin duplicación.

C13 — Security
Objetivo: revisar secretos, permissions, WIF y logs.
PASS: no secrets exposed; least privilege.

C14 — Audit/Evidence
Objetivo: actualizar auditoría con IDs de runs, commits y pruebas.
PASS: cada PASS tiene evidencia reproducible.

C15 — Closure Gate
Objetivo: aplicar matriz final de cierre.
PASS: todas las condiciones de cierre cumplidas; si falta una, NO-GO.

## 8. PROMPT PARA OTRAS IA / REVISOR INDEPENDIENTE

Actúa como auditor externo de código. No modifiques nada.

Recibe:
- repositorio AUREA;
- auditoría de cierre;
- cambios propuestos.

Busca únicamente falsos positivos de cierre:
- mocks presentados como live;
- provenance falsificada;
- authoritative=True sin origen institucional;
- local seed escapando del gate;
- workflow existente sin ejecución;
- parser construido sobre payload inventado;
- tests que no prueban la integración real.

Devuelve una lista priorizada:
CRITICAL / HIGH / MEDIUM / LOW,
con archivo, línea/función, evidencia y corrección mínima.

## 9. PROMPT DE SÍNTESIS FINAL

Integra los resultados de las 15 células sin mezclar autoridades.

Genera:
1. matriz PASS/BLOCKED/PENDING;
2. evidencia por condición;
3. commits y workflow run IDs;
4. blockers restantes;
5. cambios realizados;
6. regresiones;
7. decisión GO/NO-GO para cierre del Bibliotecario.

Regla: si una condición crítica no tiene evidencia real, la decisión es NO-GO y debe indicarse exactamente qué falta.

## 10. REGLA DE USO ENTRE IA

ChatGPT Plus: orquestación, integración, edición del repositorio, pruebas y cierre.

Gemini: segunda revisión técnica, recuperación histórica, análisis de workflows/GCP/WIF y auditoría independiente.

Otras IA disponibles: revisión adversarial/black-box o revisión puntual, sin convertir sus resultados en autoridad institucional.

La autoridad final nunca la determina Gemini, ChatGPT, GitHub, OpenAI, Browser Use, Playwright, Skyvern ni ninguna otra IA. La autoridad institucional pertenece al Bibliotecario/Knowledge OS.

## 11. ENTREGABLE OBLIGATORIO DE CADA CÉLULA

RESULTADO:
EVIDENCIA:
DECISIÓN:
APRENDIZAJE:
ADAPTACIÓN:
SIGUIENTE ACCIÓN:
COMMITS:
TESTS:
BLOCKERS:

Nunca responder solamente “hecho”, “funciona” o “PASS” sin evidencia.
