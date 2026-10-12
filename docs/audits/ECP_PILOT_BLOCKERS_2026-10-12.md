# ECP pilot — bloqueo verificado y siguiente criterio de cierre

Fecha de revisión: 2026-10-12
Base revisada: `main` en `2bf60b76ca8d775435373c9feda7c510cf22415e`.

## Hechos comprobados en código

1. `src/conchita-cloudflare-worker.ts` declara un `contextProvider` local que devuelve `citations: []` y `facts: []`. Por tanto, la ruta general del Worker no está conectada al Bibliotecario institucional real.
2. El Worker crea `RuntimeAdmission` con ese proveedor vacío y no registra `EcpInstitutionalExecutionAdapter` en una ruta ECP dedicada.
3. `src/ecp/register-ecp-execution.ts` exige explícitamente un runtime dedicado a ECP; no debe añadirse al runtime general PERSONAL/XOLAR.
4. `src/ecp/register-google-drive-ecp-execution.ts` compone el lector real de Google Drive con el gate ECP, pero requiere que el llamador aporte un token autorizado y el ID verificado del índice. El helper no demuestra despliegue ni autorización real.
5. `src/context/context-retrieval-gate.ts` puede devolver `NOT_NEEDED` para consultas no históricas cuando no encuentra contexto. La ruta ECP, en cambio, exige contexto institucional y bloquea si no hay citas institucionales aprobadas.
6. El preflight de escritura añadido a este branch es manual y no destructivo. Verifica capacidades de las carpetas, pero no demuestra que los permisos estén limitados exclusivamente a esas carpetas ni que WIF funcione hasta ejecutarse en GitHub Actions.

## Bloqueos abiertos

- `ECP-B1`: ejecutar preflight con variables institucionales reales y evidenciar autenticación WIF.
- `ECP-B2`: auditar ACL directas/heredadas y demostrar mínimo privilegio antes de conceder capacidad de escritura.
- `ECP-B3`: confirmar fuente/token de solo lectura para el runtime ECP. No reutilizar el token de escritura como token del Worker.
- `ECP-B4`: registrar `AKL-046` y publicar `INDICE_MAESTRO_v012.json` mediante un flujo separado, versionado y verificable; conservar v011 intacto.
- `ECP-B5`: registrar una ruta ECP dedicada que use el lector institucional real y `EcpInstitutionalExecutionAdapter`; no conectarlo al runtime general de Conchita.
- `ECP-B6`: desplegar y probar endpoint protegido con casos de contexto institucional presente, ausente y no autorizado.

## Criterio de aceptación del piloto

El piloto no se declara operativo hasta que una ejecución real demuestre: (a) recuperación de registros institucionales aprobados desde Drive, (b) citas con IDs/versiones rastreables, (c) bloqueo cuando el contexto institucional no existe o no está aprobado, (d) respuesta de ECP sin usar contexto local como sustituto, (e) autenticación/protección del endpoint y (f) evidencia de ejecución conservada.

## Integridad

Esta auditoría documenta lo que el código permite afirmar; no declara validación externa, permisos concedidos, escritura en Drive, registro de AKL-046, creación de v012 ni despliegue ECP. `main` y `INDICE_MAESTRO_v011.json` no se modifican.

## Revisión del preflight — actualización

Se corrigió el guard estático del índice: ahora el workflow bloquea si el ID configurado no devuelve exactamente `INDICE_MAESTRO_v011.json`, si el MIME type no es `application/json` o si `capabilities.canEdit` no es explícitamente `false`. También rechaza IDs duplicados entre las dos carpetas objetivo y el índice.

Esto corrige la condición del código, pero todavía no demuestra que los IDs configurados sean los correctos ni que Google Drive/WIF permita las operaciones previstas. El workflow no se ha ejecutado con configuración institucional real y no se debe declarar `PREFLIGHT_PASS` hasta conservar evidencia de esa ejecución. Las pruebas CI de TypeScript no validan por sí mismas el YAML del workflow ni la autenticación externa.


## Revisión adicional de ACL — cierre conservador

El preflight ahora bloquea no solo permisos de escritura heredados, sino cualquier permiso write-capable inesperado en la ACL de cada carpeta objetivo: propietario, usuario distinto de la cuenta de servicio, grupo o dominio. La única concesión de escritura aceptada por el guard es una concesión directa a la cuenta de servicio configurada en la carpeta objetivo. Esto puede producir un bloqueo legítimo en carpetas institucionales con otros editores; en ese caso se debe revisar el modelo de permisos antes de continuar, no debilitar el guard automáticamente.

Este cambio es una mejora estática de fail-closed. No demuestra todavía que Google Drive devuelva todos los detalles de permisos esperados en el entorno institucional, ni que WIF/ACL pasen en vivo. Las pruebas CI asociadas al commit deben confirmarse por separado.
