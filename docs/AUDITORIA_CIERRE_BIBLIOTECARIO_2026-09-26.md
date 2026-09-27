# AUREA — Auditoría Integral de Cierre del Bibliotecario

Fecha de auditoría: 2026-09-26
Repositorio: carlosasantoss73-tech/AUREA
Rama auditada: feat/browser-use-runtime-integration-v1
Referencia auditada: d32f93136fd682a871e3699ab2bc2f15330aba36

## RESULTADO

**CIERRE DEL BIBLIOTECARIO: NO APROBADO / PENDIENTE DE CIERRE.**

La arquitectura de protección contra falsos positivos está correctamente orientada a fail-closed, pero la evidencia disponible no demuestra todavía una conexión institucional real y reproducible entre AUREA Runtime y el Knowledge OS/Bibliotecario.

No se debe marcar BIBLIOTECARIO como CLOSED.

## 1. Criterios de cierre auditados

| Criterio | Estado | Evidencia | Conclusión |
|---|---|---|---|
| Puerto institucional definido | PASS | `apps/tool_expert_factory/institutional_authority.py` | Existe contrato read-only |
| Rechazo sin evidencia institucional | PASS | `require_authoritative_evidence()` + tests | Fail-closed probado |
| Provenance institucional | PASS | `institutional-context-provider.ts` + tests | Se conserva `INSTITUTIONAL` |
| Bloqueo de seeds locales | PASS | BIB-06 + pruebas del Context Retrieval Gate | No existe fallback local silencioso cuando `institutionalOnly=true` |
| Runtime usa recuperación institucional | PASS | BIB-06: Runtime envía `institutionalOnly: true` | El camino canónico está preparado |
| Resolución de índice v011 | PASS CONTRACT / NOT LIVE | `institutional-authority.ts` | Contrato existe; lector real no está implementado |
| Lectura real de Knowledge OS | **BLOCKED** | BIB-08 solo prepara un workflow `workflow_dispatch` | No existe evidencia de ejecución real |
| Autenticación GCP/WIF real | **BLOCKED** | BIB-08 declara explícitamente que no la demuestra | Falta evidencia operacional |
| Parser de v011 observado | **BLOCKED** | BIB-08 prohíbe implementarlo antes de observar payload | Correctamente pendiente |
| Reader institucional concreto | **BLOCKED** | El adapter declara que no contiene implementación externa | Falta implementación real |
| E2E real Bibliotecario → ContextProvider → Runtime | **BLOCKED** | No existe ejecución institucional reproducible | Falta prueba de extremo a extremo |
| Respuesta negra real sobre historial | **BLOCKED** | La prueba histórica actual debe bloquear ante seeds locales | Falta demostrar recuperación real |
| Verificación final obligatoriamente Bibliotecario-owned | **BLOCKED** | `SpecialistRuntime.verify()` acepta evidencia autoritativa genérica | La autoridad no está acoplada obligatoriamente al Bibliotecario |

## 2. Hallazgo crítico 1 — el lector institucional real todavía no existe

BIB-05 define correctamente:

`current index → version chain → scoped records → provenance`

pero su `InstitutionalAuthorityReader` es un contrato.

BIB-08 también es explícito: el workflow prepara una prueba de lectura, pero **no afirma que autenticación Google, acceso Drive o lectura v011 hayan tenido éxito**.

Por tanto:

**contrato ≠ integración operacional.**

## 3. Hallazgo crítico 2 — no existe evidencia de ejecución del probe BIB-08

El workflow de BIB-08 utiliza `workflow_dispatch`.

La auditoría no encontró una ejecución real que produzca:

- metadata del índice v011;
- bytes reales del índice;
- validación de ID;
- validación de permisos de escritura;
- shape real del documento;
- `V011_CONTENT_PROBE: PASS`.

Hasta que exista esa evidencia, el estado correcto es PENDING.

## 4. Hallazgo crítico 3 — la autoridad final todavía puede ser genérica

El contrato de `ExpertResult` considera VERIFIED válido cuando existe cualquier evidencia con:

`authoritative=True`

y `SpecialistRuntime.verify()` recibe `verification_evidence` directamente.

Eso significa que el Runtime todavía no obliga técnicamente a que la evidencia de verificación provenga del puerto:

`InstitutionalEvidenceProvider`

La existencia de `require_authoritative_evidence()` protege el puerto, pero no convierte automáticamente ese puerto en requisito universal de `VERIFY`.

Esto debe corregirse antes de afirmar que Bibliotecario es la única autoridad efectiva del cierre.

## 5. Protecciones que sí están correctamente cerradas

### Seeds locales

Los registros de continuidad están marcados:

`provenance = LOCAL_SEED`

y BIB-06 bloquea cuando `institutionalOnly=true`.

### Provenance

El adapter institucional produce:

`provenance = INSTITUTIONAL`

y existen pruebas específicas para evitar perder esa marca.

### Aislamiento por proyecto

El adapter filtra registros por `projectId`.

### Estados institucionales

BIB-05 solo acepta como actuales:

- VIGENTE
- APROBADO

y no promueve:

- INFERENCIA
- PENDIENTE
- NO_VERIFICADO

### Fail-closed

Ante ausencia de evidencia institucional, el sistema bloquea en lugar de inventar continuidad.

## 6. Prueba negra requerida para cierre

La siguiente prueba debe ejecutarse contra el lector institucional real:

**Consulta**

> ¿Qué herramientas de video trabajamos esta semana?

**Cadena obligatoria**

`Usuario → Context Retrieval Gate → InstitutionalAuthorityReader → Knowledge OS v011 → registros vigentes → ContextProvider → Runtime → respuesta`

**Evidencia mínima**

1. ID/version del índice vigente.
2. Evidencia de autenticación autorizada.
3. Registro(s) recuperados del Knowledge OS.
4. projectId correcto.
5. estado institucional válido.
6. provenance=INSTITUTIONAL.
7. traceId único.
8. respuesta del Runtime basada exclusivamente en esos registros.
9. audit trail.
10. ausencia de cualquier LOCAL_SEED en el resultado.

## 7. Condición de cierre

Bibliotecario podrá pasar a CLOSED únicamente cuando:

`LIVE_READER` = PASS

AND

`AUTHENTICATION` = PASS

AND

`V011_PAYLOAD_VERIFIED` = PASS

AND

`INSTITUTIONAL_READER` = PASS

AND

`RUNTIME_E2E` = PASS

AND

`BLACK_BOX` = PASS

AND

`VERIFICATION_IS_BIBLIOTECARIO_OWNED` = PASS

AND

`LOCAL_FALLBACK` = BLOCKED

## DECISIÓN

**No cerrar Bibliotecario.**

Mantener el estado:

`BIBLIOTECARIO = PENDING_INTEGRATION_VALIDATION`

No reconstruir el Bibliotecario histórico ni crear un segundo Knowledge Store.

## APRENDIZAJE

La parte más importante ya está protegida: AUREA actualmente evita convertir seeds locales, documentación externa o evidencia de proveedores en autoridad institucional automáticamente.

El pendiente restante es de **integración operacional y autoridad efectiva**, no de diseño conceptual.

## ADAPTACIÓN

La siguiente implementación debe partir del reader real de Knowledge OS y del payload v011 observado, no de suposiciones.

El workflow BIB-08 debe producir primero evidencia real. Después se implementa el parser exacto, luego el reader autenticado y finalmente el E2E.

## SIGUIENTE ACCIÓN

1. Ejecutar el probe BIB-08 con las credenciales/variables institucionales autorizadas.
2. Capturar metadata y payload v011 sin modificar Knowledge OS.
3. Definir el parser sobre el payload real.
4. Implementar el reader institucional read-only.
5. Conectar reader → InstitutionalContextProvider.
6. Ejecutar el black-box histórico.
7. Hacer que la verificación final utilice obligatoriamente evidencia obtenida mediante el puerto Bibliotecario.
8. Repetir auditoría y solo entonces evaluar CLOSED.

## CONCLUSIÓN

**El cierre del Bibliotecario NO es correcto todavía.**

El estado técnicamente defendible es:

**PENDIENTE — INTEGRACIÓN INSTITUCIONAL REAL + E2E + AUTORIDAD DE VERIFICACIÓN.**


## 12. Evidencia CI actualizada — ejecución paralela 2026-09-26

Se ejecutó una batería paralela de validación sobre la rama auditada.

### Resultados confirmados
- AUREA P0 #532: **SUCCESS**
- AUREA OpenAI Provider Contract #25: **SUCCESS**
- AUREA Tool Expert Factory Contracts #173: **SUCCESS**
- AUREA Free Browser Runtime Smoke #5: **SUCCESS**
- AUREA Four Tools Audit V1 #99: Playwright MCP **SUCCESS**, Stagehand **SUCCESS**, Browser Use **SUCCESS**, OpenAI provider **SUCCESS**, Super Agent E2E **SUCCESS**, Knowledge audit **SUCCESS**.
- En Four Tools Audit #99, Provider Fallback E2E y Skyvern permanecían en ejecución al momento de esta actualización; no se elevan a PASS hasta disponer de su conclusión.

### Ajuste de cierre
Se mantiene la separación entre ejecución de herramientas y autoridad institucional. La ejecución real de Playwright MCP demuestra capacidad operacional de browser, pero su evidencia sigue siendo no autoritativa.

### Probe institucional
El workflow de v011 fue actualizado en el commit dc82cd4312a7a70fd53e180f4c32514916bc2724 para permitir ejecución automática en actualizaciones de la rama, además de workflow_dispatch. La comprobación de esta auditoría no encontró todavía un run asociado que produzca V011_CONTENT_PROBE: PASS.

Por tanto, LIVE_READER, AUTHENTICATION y V011_PAYLOAD_VERIFIED continúan PENDING/BLOCKED por falta de evidencia de ejecución, no por fallo demostrado.


## 13. Evidencia crítica BIB-08 — primer run real

El probe institucional fue finalmente ejecutado automáticamente mediante el workflow **AUREA Knowledge OS v011 Live Reader Probe #4**, run `36291890624`.

### Resultado
**FAIL en autenticación WIF.**

Job `probe`: `108543431786`.

La etapa `Authenticate to Google Cloud through WIF` falló antes de instalar el cliente de Google o leer Drive. El log reporta que la acción `google-github-actions/auth@v3` no recibió exactamente uno de `workload_identity_provider` o `credentials_json`.

Esto convierte el pendiente anterior en un **bloqueo operacional demostrado**, no en un simple supuesto:

- `AUTHENTICATION`: **BLOCKED**
- `LIVE_READER`: **BLOCKED por dependencia de autenticación**
- `V011_PAYLOAD_VERIFIED`: **PENDING**, porque nunca se llegó a leer el payload
- `INSTITUTIONAL_READER`: **PENDING**, correctamente no implementado sobre un payload no observado

No se expusieron secretos en el log. Las variables institucionales `AUREA_GCP_WIF_PROVIDER` y `AUREA_GCP_SERVICE_ACCOUNT` no llegaron al action como valores válidos en esta ejecución.

### Siguiente acción mínima
Configurar en el repositorio/entorno de GitHub las variables institucionales necesarias para WIF (`AUREA_GCP_WIF_PROVIDER` y `AUREA_GCP_SERVICE_ACCOUNT`) con sus valores autorizados, y repetir el probe. No se deben colocar valores de credenciales en el código.
