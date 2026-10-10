# BORRADOR DE ACTA — Propuesta de incorporación documental ECP / AKL-046

**Estado:** BORRADOR PREPARATORIO — NO ES ACTA INSTITUCIONAL EMITIDA  
**Fecha de autorización del usuario:** 2026-10-08  
**Índice de referencia:** INDICE_MAESTRO_v011.json (VIGENTE; solo lectura)  
**Versión institucional siguiente:** v012, únicamente después de crear/verificar el documento y completar el procedimiento.

## 1. Objeto

Dejar trazabilidad de la autorización expresa para tramitar la incorporación del agente ECP al Universal AI Librarian en estado **PROPUESTA**, sin sobrescribir ni editar el índice vigente.

## 2. Alcance autorizado

- Preparar el documento `ECP_AGENTE_CONTRATACION_PUBLICA_ECUADOR_v1.md`.
- Tramitar su creación en la carpeta institucional `03_AGENTES`.
- Completar la ficha documental con el fileId real y metadatos verificados.
- Confirmar que `AKL-046` está disponible y revisar duplicados, dependencias y decisiones relacionadas.
- Preparar la siguiente versión del índice, preservando v011 y su trazabilidad, solo después de verificar el documento institucional.
- Verificar por lectura posterior que el registro aparece con proyecto ECP y estado PROPUESTA.

## 3. Límites

Esta autorización no equivale a aprobación final del agente ni a autorización para marcarlo APROBADO u OPERATIVO. No permite inventar el fileId, asumir disponibilidad de AKL-046 sin volver a comprobarla, editar v011, ni eludir el Bibliotecario.

## 4. Verificaciones pendientes antes de emitir el acta institucional

- [x] Confirmar en Drive la disponibilidad de AKL-046 y ausencia de duplicado: la prueba live #118 no encontró `AKL-046` en la cadena institucional ni encontró `ECP_AGENTE_CONTRATACION_PUBLICA_ECUADOR_v1.md` en Drive.
- [ ] Crear el documento en `03_AGENTES` mediante el flujo autorizado. **Bloqueado:** la identidad actual informa `canAddChildren=false`, `canEdit=false` y el workflow solicita scope `drive.readonly`.
- [ ] Registrar fileId institucional y verificar metadatos.
- [ ] Completar la ficha con los campos obligatorios de la plantilla institucional.
- [ ] Revisar dependencias y la discrepancia documental identificada en la propuesta AKL-046.
- [ ] Construir v012 desde el esquema real de v011 sin perder registros ni alterar v011.
- [ ] Guardar la nueva versión y el acta en las ubicaciones institucionales correspondientes.
- [ ] Releer por API y comprobar versión, estado, ID, proyecto, carpeta y fileId.
- [ ] Ejecutar búsqueda de recuperación para `projectId: ECP` y guardar evidencia del resultado.

## 5. Resultado

**Estado actual:** autorización de usuario para tramitar la incorporación y paquete preparatorio en repositorio. Preflight live #118 confirma que AKL-046 no está duplicado, pero la identidad actual no puede escribir en `03_AGENTES`; la escritura institucional y la actualización de índice siguen sin ejecutarse. Próxima dependencia: habilitación de un flujo de escritura con mínimo privilegio, sin editar v011.

**Firmas / aprobaciones institucionales:** no completadas en este borrador.
