# HYPER-16 — Event-Driven Autonomy V1

## Objetivo
Crear el límite técnico para que AUREA pueda reaccionar a eventos y reanudar flujos de larga duración sin convertir el ciclo autónomo en ejecución implícitamente libre.

## Implementado
- `RuntimeEvent` con `eventId`, `eventType`, `traceId`, `projectId`, Work Cell opcional, tiempo y payload.
- `EventStore` desacoplado para permitir posteriormente persistencia durable.
- `InMemoryEventStore` para pruebas y desarrollo.
- `EventDrivenRuntime` con suscripción, publicación y replay por `traceId`.
- Idempotencia por `eventId`.
- Persistencia del evento antes del dispatch.
- Fallo de handler no elimina el evento ya aceptado.

## Límites de seguridad
Este componente NO:
- ejecuta herramientas;
- concede permisos;
- selecciona proveedores;
- modifica Knowledge OS protegido;
- convierte por sí mismo un evento en autorización de ejecución;
- afirma persistencia durable cuando se usa el store en memoria.

La ejecución continúa dependiendo de los gates existentes de autorización, Work Cell, proveedor, Sentinel, QA y Audit.

## Siguiente evolución
1. Adaptador durable del EventStore sobre el estado persistente existente.
2. Reanudación gobernada `RESUME_REQUESTED` → recuperación de Work Cell → validación → nueva admisión.
3. Integración con `AutonomyCycle` para que los eventos sean disparadores del ciclo, sin saltarse sus transiciones.
4. Observabilidad de publicación, consumo, latencia y errores.
5. Prueba E2E de recuperación después de interrupción.

## Evidencia y cierre
Resultado: contrato implementado y probado en aislamiento.

Evidencia: tests de idempotencia, replay, aislamiento de trazas y retención ante fallo de handler.

Decisión: mantener el componente como boundary independiente hasta validar integración E2E.

Próxima acción: conectar el event boundary con persistencia y recovery sin introducir regresiones.
