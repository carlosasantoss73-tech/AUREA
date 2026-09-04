# HYPER-14 — Canal Ejecutivo Presidente ↔ CEO

## Objetivo
Definir un canal determinista para que el Presidente/Owner pueda solicitar conversación directa con el CEO/GM de una empresa del Holding, sin obligarlo a pasar por Atención al Cliente.

## Modelo
- Cliente → Customer Service Agent de la empresa.
- Presidente/Owner → AUREA → CEO/GM de la empresa seleccionada.
- CEO/GM → AUREA para asuntos del Holding.
- Agentes operativos → CEO/GM solo dentro de su autoridad asignada.

## Regla crítica
El enrutamiento del canal **no concede autoridad de negocio**. La ejecución posterior continúa sometida al Permission Gateway, alcance de empresa, contexto autorizado, trazabilidad y auditoría.

## Registro mínimo por empresa
- `companyId`
- `customerServiceAgentId`
- `ceoAgentId`
- estado del canal

## Registro mínimo por solicitud
- `traceId`
- identidad del solicitante
- tipo de solicitante
- empresa objetivo
- canal solicitado
- objetivo de la conversación
- resultado ROUTE/BLOCK
- agente destino, si fue autorizado
- motivo de bloqueo, si aplica

## Política de seguridad
1. No enrutar a una empresa inexistente o con canal inactivo.
2. El canal ejecutivo directo está reservado al Presidente/Owner.
3. Customer Service no se usa como intermediario obligatorio para comunicación ejecutiva.
4. La conversación recibe únicamente el contexto autorizado para la relación Presidente ↔ empresa.
5. Las acciones derivadas requieren los controles normales de permisos, aprobación y auditoría.

## Estado
Implementación P0 aditiva: contrato de directorio + router determinista + pruebas de ruta positiva y fail-closed.

No afirma integración con mensajería externa ni con un CEO autónomo hasta contar con runtime/conectividad real y evidencia de extremo a extremo.
