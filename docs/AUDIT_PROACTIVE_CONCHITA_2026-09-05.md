# Auditoría proactiva Conchita — 2026-09-05

## Hallazgo corregido

El endpoint `/health` del Worker respondía `200 OK` sin comprobar la configuración mínima del runtime. Esto podía producir un falso positivo: el proceso HTTP estaba vivo aunque faltaran credenciales o configuración esencial para ejecutar Conchita.

## Corrección

El health check debe distinguir entre:

- `OK`: configuración mínima presente.
- `BLOCKED`: configuración crítica ausente.

No debe ejecutar Anthropic ni escribir en KV; el health check sigue siendo barato y seguro.

## Aprendizaje reutilizable

Un endpoint de salud no debe significar solamente "el proceso respondió" cuando existe un contrato de ejecución. Debe verificar, como mínimo, las dependencias locales indispensables para que el servicio pueda cumplir su misión, sin convertir el health check en una operación costosa o con efectos secundarios.

## Riesgos que permanecen abiertos

1. Idempotencia de `clientRequestId` a nivel Gateway todavía no está conectada con la idempotencia por `traceId` del ExecutionRuntime.
2. El `ExecutionResultStore` basado en una única clave KV es adecuado para el piloto controlado, pero no ofrece CAS/atomicidad frente a concurrencia; Cloudflare documenta que escrituras concurrentes sobre la misma clave pueden sobrescribirse.
3. La PWA permite configurar la URL del API; antes del piloto real debe asegurarse que el token de activación solo se envíe a un endpoint HTTPS esperado.
4. El adapter de Anthropic podría conservar el `request-id` de Anthropic como evidencia operacional para diagnóstico.

Estos puntos no se consideran cerrados hasta ser corregidos o aceptados explícitamente como riesgo de piloto.
