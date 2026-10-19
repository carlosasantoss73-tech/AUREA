# AUREA — Diseño de conexión Bibliotecario → Conchita y persistencia
Fecha: 2026-10-19
Estado: PROPUESTA TÉCNICA; no desplegada, no modifica Drive ni el índice institucional.

## Resultado de inspección
- `src/context/google-drive-institutional-reader.ts` ya implementa lectura del índice maestro y cadena de índices desde Google Drive, con validación de versión/estado, selección de registros y uso de token de acceso.
- `src/context/google-drive-institutional-context-provider.ts` ya convierte el lector institucional en un ContextProvider compatible con `ContextRetrievalGate`.
- `src/ecp/register-google-drive-ecp-execution.ts` demuestra cómo se compone el lector, proveedor, gate y adaptador ECP en un runtime dedicado. Es helper de composición, no deployment.
- `src/conchita-cloudflare-worker.ts` todavía instancia un ContextProvider que retorna `citations: []` y `facts: []`. Por tanto Conchita no acredita recuperación institucional con esa implementación.
- Conchita ya almacena sesiones en KV y resultados de ejecución en Durable Object. Es persistencia operativa, separada de la fuente documental.
- `docs/ecp/PILOT_STATUS.md` registra cero ECP aprobados en índice v011 y el scope actual `drive.readonly`; no hay autorización de escritura disponible en el flujo probado.

## Decisión arquitectónica
1. El Bibliotecario/Knowledge OS mantiene la única autoridad institucional y el índice maestro versionado. No crear segundo índice ni copiar la base de conocimiento a Conchita.
2. Conchita invoca un ContextProvider institucional reutilizando `GoogleDriveInstitutionalReader` y `createGoogleDriveInstitutionalContextProvider`, con credencial de lectura de mínimo privilegio y file ID del índice vigente verificado desde configuración segura.
3. El `ContextRetrievalGate` conserva autorización y modo fail-closed. Para solicitudes `institutionalOnly`, solo citar fuentes con procedencia `INSTITUTIONAL`; si no hay citas/hechos válidos, bloquear o declarar insuficiencia, jamás rellenar desde una memoria inventada.
4. Mantener KV para sesiones y Durable Objects para resultados mientras cumplan sus necesidades de persistencia operacional; probar recuperación tras reinicio, TTL, replay idempotente y límites de retención. No migrar estos datos por impulso.
5. Separar en un inventario y política: documentos/índices institucionales; sesiones operativas; resultados/trazas; secretos. Cifrado, control de acceso, backups, restauración y auditoría deben verificarse en proveedor/entorno, no suponerse por el nombre del servicio.

## Implementación propuesta, por etapas
A. Añadir configuración explícita server-side para activar el lector institucional en Conchita (índice verificado + mecanismo que renueve token WIF/OAuth compatible con runtime). No incluir tokens en cliente, logs ni repositorio.
B. Crear un factory probado que construya `GoogleDriveInstitutionalReader` y el provider ya existente, inyectándolo en `ContextRetrievalGate`; eliminar el proveedor vacío solo en rama/PR.
C. Añadir pruebas unitarias con fixtures para: registro institucional recuperado con ID/versión/fuente; cero resultados; permiso denegado; token/Drive 401/403; índice malformado; registro en estado PROPUESTA; cita sin provenance; query de otro proyecto. Deben probar que la ruta sensible falla cerrada.
D. Ejecutar tests + typecheck + workflow live de lectura usando identidad autorizada; comparar cita retornada con el índice de verdad. No registrar contenido sensible en logs.
E. Desplegar solo después de CI verde y smoke de integración; mantener reversa de Worker y sesiones/resultados.
F. Resolver escritura institucional de ECP por carril separado: pedir acceso de escritura de mínimo privilegio al administrador; incorporar el registro mediante proceso autorizado y verificar lectura posterior. Nunca convertir el scope `drive.readonly` en supuesto permiso de escritura.

## Gates de aceptación
- CITATIONS > 0 en caso de dato institucional conocido, y cada cita tiene sourceId/documentId/version/provenance.
- `ContextRetrievalGate` retorna READY solo si la política y evidencia cumplen.
- Consulta histórica sin fuente: EMPTY/BLOCKED según contrato, sin invención.
- Fallo de Drive/token, índices inválidos o registros no aprobados: bloqueo seguro.
- Sin filtrado de tokens/secretos, sin acceso entre proyectos y sin writes a Drive.
- Health check distingue existencia de configuración de conectividad real y recuperación contextual real.
- Registrar latencia por etapa: autenticación/lectura índice/cadena de registros/gate/proveedor, además del total.

## Resultado → Evidencia → Decisión → Aprendizaje → Adaptación → Próxima acción
- RESULTADO: hay piezas reutilizables para conexión institucional; la ruta de Conchita sigue usando un provider vacío.
- EVIDENCIA: archivos listados arriba en `main`, y estado de ECP en `docs/ecp/PILOT_STATUS.md`.
- DECISIÓN: reutilizar el lector institucional existente; no reconstruir Bibliotecario ni crear almacén documental paralelo.
- APRENDIZAJE: que exista KV/DO no prueba persistencia del conocimiento institucional; que se lea v011 no prueba que Conchita lo consulte.
- ADAPTACIÓN: implementar como PR aislada; no tocar `main`, no escribir Drive y no cambiar v011 durante la validación.
- PRÓXIMA ACCIÓN: crear rama de integración, añadir factory/configuración y pruebas primero; después ejecutar CI y smoke con credencial de lectura autorizada.
