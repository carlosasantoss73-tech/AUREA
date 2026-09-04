# HYPER-CONCHITA — Cierre acelerado V1

Fecha: 2026-09-04
Base: `main`

## Objetivo
Cerrar el piloto móvil Conchita con la máxima velocidad compatible con evidencia, seguridad y no-regresión. No reconstruir arquitectura existente.

## Regla de trabajo
Parallelizar investigación, auditoría y pruebas independientes. Integrar cambios únicamente mediante contratos explícitos y `branch → PR → CI → review → merge`.

## Gates

| Gate | Evidencia requerida | Estado inicial | Propietario lógico |
|---|---|---|---|
| G0 | PWA publicada por HTTPS | VERIFICAR | Deployment |
| G1 | bootstrap de sesión real, autenticada, revocable/expirable | BLOQUEADO/VERIFICAR | Identity/Session |
| G2 | endpoint HTTPS real `/conchita/v1/message` | BLOQUEADO | Cloud Gateway |
| G3 | adapter de provider realmente ejecutable | BLOQUEADO/VERIFICAR | Provider |
| G4 | teléfono → Gateway → identidad → AUREA → provider → respuesta | BLOQUEADO | E2E |
| G5 | continuidad/recovery con identidad y contexto | PARCIAL | Continuity |
| G6 | duplicado, timeout, offline, revoked/expired | PARCIAL | Adversarial QA |
| G7 | QA/Audit independiente con evidencia | PARCIAL | QA/Audit |
| G8 | aceptación reproducible del piloto | PENDIENTE | Auditor |

## Hallazgo de arquitectura
`ConchitaRuntimeBridge` ya conecta admisión → selección de provider → ExecutionRuntime. El cuello de botella no es otro runtime: es la frontera HTTP/autenticación/sesión/provider ejecutable y su evidencia operacional.

## Decisión provisional de infraestructura
Evaluar primero Cloudflare Workers como adaptador HTTP TypeScript por encajar naturalmente con un handler `fetch` y Wrangler; evaluar Supabase Edge Functions si la autenticación/sesión gestionada reduce materialmente el trabajo. No se considera ninguna cuenta, secreto o despliegue conectado hasta obtener evidencia real.

## Prohibiciones
- No colocar claves de provider en la PWA.
- No confiar en `userId` enviado por navegador como identidad autoritativa.
- No declarar `EXECUTABLE` un provider sin adapter real y evidencia.
- No declarar E2E por tests unitarios.
- No fusionar ramas antiguas sin auditoría de base, diff y CI.
- No modificar Knowledge OS protegido ni `INDICE_MAESTRO_v007`.

## Estrategia de aceleración
1. Recuperar únicamente trabajo previo compatible con `main`.
2. Separar contrato de transporte de implementación de infraestructura.
3. Probar primero una interacción mínima real.
4. Endurecer fallos e idempotencia inmediatamente después.
5. Cerrar con evidencia de runtime, no solo código.

## Cierre anti-regresión
Cada célula debe registrar: Resultado → Evidencia → Decisión → Aprendizaje → Adaptación futura → Siguiente acción.
