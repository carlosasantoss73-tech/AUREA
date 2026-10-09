# ECP — Bibliotecario: evidencia de acceso y brecha del conector

Corte de verificación: 09-oct-2026 (UTC del registro de GitHub Actions).

## RESULT

La ejecución GitHub Actions AUREA Knowledge OS v011 Live Reader Probe (run 99, ID 37871039140) terminó con conclusión success. El runner se autenticó en Google Cloud mediante Workload Identity Federation y leyó el archivo configurado como INDICE_MAESTRO_v011.json.

## EVIDENCE

El log de la ejecución reporta:
- Autenticación WIF: GCP_WIF_CONFIGURATION: PRESENT_AND_FORMAT_VALID.
- ID del archivo de índice leído: 1kIzswJSMKzQOpf8z6j8iDvfxhq26ZvXa.
- Nombre: INDICE_MAESTRO_v011.json.
- MIME type: application/json.
- Versión de Drive: 4.
- capabilities.canEdit: false.
- Contenido leído: 133 bytes, SHA-256 a4d64d08ae593e670fe4c93d2c5e8df7d75ee5db1e962610d788fb222fb55ceb.
- El JSON tiene solo cuatro claves de nivel superior: id, kind, mimeType, name.
- Resultado de la sonda: V011_CONTENT_PROBE: PASS.

## DECISION

La evidencia demuestra autenticación real y lectura de un archivo institucional concreto en modo no editable. No demuestra todavía recuperación de registros/documentos institucionales ni búsqueda por proyecto/consulta. El JSON leído se comporta como descriptor del archivo, no como un índice de registros consultables.

Por tanto, no se debe cambiar el estado de ECP a operativo ni afirmar que el Bibliotecario ya está integrado.

## LEARNING

El bloqueo no es simplemente la falta de credenciales: el workflow dispone de WIF configurado y puede leer el descriptor del índice. Falta determinar el esquema real del descriptor, la ubicación/ID del índice de registros y el mecanismo autorizado de consulta del Knowledge OS. No inferir esos datos ni crear un índice alternativo.

## ADAPTATION

Implementar un lector concreto y de solo lectura detrás de InstitutionalAuthorityReader cuando se haya identificado en el Bibliotecario la estructura autorizada real. Debe:
1. leer y validar el índice vigente;
2. resolver la cadena de versiones sin promover índices reemplazados;
3. recuperar registros del proyecto solicitado;
4. conservar ID de documento, versión, fuente, estado y localizador real;
5. devolver solo registros VIGENTE o APROBADO;
6. bloquear si el esquema o la procedencia no se pueden verificar;
7. nunca editar el índice institucional ni hacer fallback silencioso a semillas locales.

## NEXT ACTION

Inspeccionar el contenido íntegro del descriptor y el árbol de la carpeta raíz institucional con la identidad de lectura ya configurada; identificar el documento real de registros y su esquema; documentar el contrato confirmado; implementar y probar el lector concreto. Después, conectar el lector al adaptador institucional y al runtime ECP, y ejecutar una prueba de búsqueda con cita y localizador real.
