# AUREA — CONTEXT PACK DE CONTINUIDAD (derivado, no institucional)

**Fecha de preparación:** 2026-10-25  
**Propósito:** permitir retomar el trabajo en otro chat sin convertir este documento en fuente institucional ni reemplazar el Bibliotecario.  
**Estado:** PAQUETE DE TRABAJO DERIVADO — NO REGISTRADO EN DRIVE — NO AUTORIZA ESCRITURA.

## 1. Autoridad y regla operativa

- La única autoridad institucional es Universal AI Librarian / Knowledge OS y su índice maestro vigente.
- No reconstruir componentes existentes, no crear índice/almacén paralelo, no promover notas de continuidad o prompts a registros VIGENTE.
- No editar `INDICE_MAESTRO_v011.json`, Drive, permisos, secretos o variables; no fusionar ni desplegar sin autorización expresa.
- Si una tarea no produce evidencia nueva ni resuelve un bloqueo, no repetirla.
- Registrar cada paso como RESULTADO → EVIDENCIA → DECISIÓN → APRENDIZAJE → ADAPTACIÓN → SIGUIENTE ACCIÓN.
- No declarar el Bibliotecario CLOSED ni ECP operativo sin prueba live positiva y negativa real, con trazabilidad.

## 2. Estado técnico verificado en repositorio

### PR #231
- URL: https://github.com/carlosasantoss73-tech/AUREA/pull/231
- Estado al consultar 2026-10-25: abierto, sin fusionar, listo para revisión.
- HEAD: `84720eff980a92f62c850dc8a83a9366d6293340`.
- Cuatro workflows asociados al commit constaban en success:
  - AUREA P0 #1030, run 40163907311
  - Conchita Typecheck Diagnostic #451, run 40163907316
  - ECP Cloudflare Worker Build #86, run 40163907421
  - AUREA Knowledge OS v011 Live Reader Probe #156, run 40163907308
- No repetir los checks verdes sin un cambio de código o una razón concreta.

### Probe institucional y límite real
- Run: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/40163907308
- Evidencia previa consultada: cadena de índices leída hasta v011, 45 IDs únicos; AKL-046 ausente; `APPROVED_ECP_RECORDS: 0`; gate bloqueado; `PROVIDER_CALLS: 0`.
- `INDICE_MAESTRO_v011.json` permanece intacto; no escribir sobre él.
- En main, `src/conchita-cloudflare-worker.ts` define un `contextProvider` que devuelve `citations: []` y `facts: []`. Así que la ruta inspeccionada de Worker a Conchita no acredita recuperación real de Bibliotecario.
- El lector `src/context/google-drive-institutional-reader.ts` permite token como cadena o función asíncrona, pero esa interfaz por sí sola no prueba renovación de credenciales en el Worker desplegado.
- `src/ecp/context-pack.ts` bloquea si falta contexto/citas o hay metadatos inválidos; es un builder puro, no conector institucional.

## 3. Continuidad del Context Pack: evidencia y limitación

- En main no se encontró `CONTEXT_PACK_AUREA_v2`, la plantilla `PLANTILLA_CONTEXT_PACK.md` ni `INDICE_MAESTRO_v011.json` como archivos del repositorio. La búsqueda del árbol de GitHub solo encontró documentación de auditoría y `src/ecp/context-pack.ts`.
- Por tanto, la afirmación de que CONTEXT_PACK_AUREA_v2 está EN PRUEBA y se construyó desde v007 se conserva como antecedente del chat/registro previo, no como resultado de una nueva lectura de Drive.
- La continuidad canónica debe recuperarse en este orden: índice maestro vigente → Context Pack aplicable → última acta → documentos fuente necesarios.
- Este documento resume continuidad operativa conocida y enlaza evidencia de repositorio; NO reemplaza el Context Pack institucional, el acta ni la lectura de Drive.

## 4. Documentos fuente del repositorio a retomar

1. Auditoría de cierre del Bibliotecario (26-sep-2026):  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/AUDITORIA_CIERRE_BIBLIOTECARIO_2026-09-26.md  
   Decisión registrada: NO cerrar; faltaba integración institucional reproducible y prueba end-to-end.
2. Checklist WIF/Bibliotecario (27-sep-2026):  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/WIF_BIBLIOTECARIO_CHECKLIST_CIERRE_2026-09-27.md  
   Contiene requisitos del flujo autorizado WIF. No incluir valores secretos.
3. Brecha conector Bibliotecario (9-oct-2026):  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/ecp/BIBLIOTECARIO_CONNECTOR_GAP.md  
   Reportó lectura de descriptor de Drive de 133 bytes, no recuperación de registros consultables; no asumir que un descriptor es el índice de registros.
4. Alcance del Bibliotecario para ECP:  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/ecp/BIBLIOTECARIO_SCOPE.md  
   Insiste en una sola autoridad, no duplicar índice y no operar hasta validar recuperación institucional real.
5. Propuesta AKL-046 (NO INCORPORADA):  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/ecp/PROPUESTA_REGISTRO_BIBLIOTECARIO_AKL-046.md
6. Borrador de acta AKL-046 (NO ES ACTA EMITIDA):  
   https://github.com/carlosasantoss73-tech/AUREA/blob/main/docs/ecp/BORRADOR_ACTA_INCORPORACION_AKL-046.md

## 5. Matriz de estado

| Área | Estado | Base |
|---|---|---|
| Contrato de autoridad/fail-closed | DOCUMENTADO / IMPLEMENTADO | código y pruebas del repositorio |
| PR #231 reader incremental y precedencia | IMPLEMENTADO / CI PROBADO | HEAD indicado y workflows reportados success |
| Lectura live del descriptor/índice configurado | PROBADO en el run citado | no prueba por sí sola recuperación de registros |
| Cadena del índice v011 | PROBADO según probe citado | 45 IDs únicos; no ECP aprobado |
| Recuperación de registros ECP aprobados | BLOQUEADO | 0 aprobados; AKL-046 ausente |
| Conexión Worker → contexto institucional | NO PROBADO / NO OPERATIVO | Worker inspeccionado entrega facts/citations vacíos |
| Context Pack derivado actualizado desde lectura nueva de Drive | NO VALIDADO | solo lectura GitHub; no consulté Drive en esta acción |
| Transferencia exitosa a otro chat | PENDIENTE | requiere ejercicio de recuperación independiente |
| Bibliotecario cerrado | NO | faltan criterios de integración y prueba live end-to-end |

## 6. Siguiente secuencia mínima, por evidencia nueva

**Paso A — recuperar metadatos documentales desde Drive con lectura autorizada:** comprobar el índice vigente y localizar el Context Pack institucional y la última acta; capturar IDs, versiones, estados y ubicaciones. No escribir. No repetir búsquedas ya hechas si el resultado sigue siendo válido.

**Paso B — producir Context Pack v3 de continuidad como artefacto DERIVADO:** comparar con el Context Pack existente; conservar enlaces, decisiones, bloqueos, estado y trazas; no cambiar estado institucional ni presentar derivado como fuente de verdad.

**Paso C — transferencia entre chats:** pegar este artefacto en una conversación nueva y exigir recuperación de objetivos, autoridad única, HEAD/PR, evidencia y bloqueos sin pedir al usuario los datos ya incluidos. La aceptación es que la conversación receptora distinga evidencia institucional, evidencia de GitHub y antecedentes no revalidados.

**Paso D — cerrar integración del Bibliotecario:** identificar con el flujo de lectura autorizado el verdadero índice de registros (no confundir descriptor Drive con payload); conectar el reader real al ContextProvider que usa el runtime; ejecutar prueba positiva con citas y trazabilidad y prueba negativa de rechazo; verificar que LOCAL_SEED y fuentes externas no satisfacen el cierre institucional.

## 7. Bloqueos y responsables funcionales

- **Autorización/operación documental institucional:** autoridad responsable de la biblioteca debe validar qué documentos y decisiones están autorizados; ninguna IA puede inventar esa aprobación.
- **Administración técnica del entorno cloud:** demostrar la autenticación de solo lectura y su renovación real en el servicio Cloudflare; no compartir claves ni tokens.
- **Implementación runtime:** conectar el proveedor ContextProvider existente al lector institucional; no crear segundo Bibliotecario.
- **Revisión de cambios:** PR #231 sigue pendiente de revisión; no fusionar como parte de esta tarea.

## 8. Prompts de control para el siguiente chat

Actúa como responsable senior de continuidad técnica del proyecto AUREA. La meta prioritaria es terminar el Bibliotecario Universal para recuperar conocimiento autorizado y hacerlo portable a una nube/CEPHU, sin dependencia de chats. No reconstruyas componentes ni crees un almacén/índice paralelo. Trata este Context Pack como continuidad derivada, no como autoridad institucional.

Antes de cada acción: explica brevemente qué evidencia nueva producirá o qué bloqueo resolverá. No repitas checks verdes. Lee el índice vigente → Context Pack institucional → última acta → fuentes necesarias, usando solo acceso autorizado. No modifiques Drive, índice, variables, secretos, permisos, no fusiones ni despliegues sin autorización.

Empieza verificando únicamente si hay cambios desde el estado descrito; luego ejecuta el siguiente paso que produzca evidencia nueva. Para cerrar Bibliotecario exige: lectura institucional real, citas y procedencia verificables, conexión al runtime, prueba positiva real, rechazo negativo real, recuperación en otra sesión/entorno y auditoría. Si algo falta, devuelve el bloqueo exacto sin simulación.

## 9. Resultado de esta preparación

Este archivo está listo para utilizarse como transferencia de contexto entre chats, pero NO está guardado en Drive ni incorporado al índice institucional. La continuidad se prueba solo cuando el siguiente chat lo recupera y distingue correctamente las fuentes de evidencia.

