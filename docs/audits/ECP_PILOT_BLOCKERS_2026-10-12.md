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
- `ECP-B5`: confirmar que la ruta ECP desplegada está conectada al lector institucional aprobado y al adaptador de ejecución previsto; no conectarlo al runtime general de Conchita.
- `ECP-B6`: configurar y probar el endpoint protegido con casos de contexto institucional presente, ausente y no autorizado.

## Criterio de aceptación del piloto

El piloto no se declara operativo hasta que una ejecución real demuestre: (a) recuperación de registros institucionales aprobados desde Drive, (b) citas con IDs/versiones rastreables, (c) bloqueo cuando el contexto institucional no existe o no está aprobado, (d) respuesta de ECP sin usar contexto local como sustituto, (e) autenticación/protección del endpoint y (f) evidencia de ejecución conservada.

## Integridad

Esta auditoría no declara validación institucional, permisos concedidos, recuperación real del Bibliotecario, escritura en Drive, registro de AKL-046 ni creación de v012. Hay un despliegue bootstrap del Worker en `main`, pero no equivale a un piloto operativo. `main` y `INDICE_MAESTRO_v011.json` no se modifican.

## Revisión del preflight — actualización

Se corrigió el guard estático del índice: ahora el workflow bloquea si el ID configurado no devuelve exactamente `INDICE_MAESTRO_v011.json`, si el MIME type no es `application/json` o si `capabilities.canEdit` no es explícitamente `false`. También rechaza IDs duplicados entre las dos carpetas objetivo y el índice.

Esto corrige la condición del código, pero todavía no demuestra que los IDs configurados sean los correctos ni que Google Drive/WIF permita las operaciones previstas. El workflow no se ha ejecutado con configuración institucional real y no se debe declarar `PREFLIGHT_PASS` hasta conservar evidencia de esa ejecución. Las pruebas CI de TypeScript no validan por sí mismas el YAML del workflow ni la autenticación externa.

## Revisión adicional de ACL — cierre conservador

El preflight ahora bloquea no solo permisos de escritura heredados, sino cualquier permiso write-capable inesperado en la ACL de cada carpeta objetivo: propietario, usuario distinto de la cuenta de servicio, grupo o dominio. La única concesión de escritura aceptada por el guard es una concesión directa a la cuenta de servicio configurada en la carpeta objetivo. Esto puede producir un bloqueo legítimo en carpetas institucionales con otros editores; en ese caso se debe revisar el modelo de permisos antes de continuar, no debilitar el guard automáticamente.

Este cambio es una mejora estática de fail-closed. No demuestra todavía que Google Drive devuelva todos los detalles de permisos esperados en el entorno institucional, ni que WIF/ACL pasen en vivo. Las pruebas CI asociadas al commit deben confirmarse por separado.

## Evidencia CI — actualización posterior

Commit revisado: `987e3836cdeca170b53fba4d52f1bfc3b38f56a7`.

- **ECP Preflight Static Guard #1:** concluido con éxito. Los pasos `Parse workflow YAML` y `Assert conservative preflight invariants` terminaron correctamente. Evidencia: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/38194620727
- **AUREA P0 #863:** concluido con éxito; typecheck y tests pasaron. Evidencia: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/38194620686
- **Conchita Typecheck Diagnostic #362:** concluyó correctamente. Evidencia: https://github.com/carlosasantoss73-tech/AUREA/actions/runs/38194620703

Estos resultados confirman validaciones estáticas y de código para el commit indicado. No prueban la autenticación WIF, los permisos reales de Google Drive, recuperación institucional, registro de AKL-046 ni publicación de v012. Los bloqueos ECP-B1 a ECP-B6 permanecen abiertos hasta obtener evidencia específica.

## Evidencia de despliegue — bootstrap no operativo

Se inspeccionó la ejecución [ECP Cloudflare Pilot Deploy #38113326270](https://github.com/carlosasantoss73-tech/AUREA/actions/runs/38113326270), ejecutada el 2026-10-11 desde `main` en `2bf60b76ca8d775435373c9feda7c510cf22415e`.

- El paso `Deploy ECP Worker` concluyó correctamente y registró el Worker `aurea-ecp-pilot` en `https://aurea-ecp-pilot.carlosasantoss73.workers.dev`.
- Los parámetros de Cloudflare Access quedaron vacíos; los valores provisionales de Access y del índice institucional permanecieron en la configuración.
- Los logs indicaron que `ANTHROPIC_API_KEY` y `ECP_GOOGLE_DRIVE_ACCESS_TOKEN` no estaban configurados.
- La ejecución, por tanto, demuestra publicación del Worker en modo bootstrap, no acceso protegido, recuperación del Bibliotecario ni análisis real.
- La rama `feat/ecp-controlled-drive-write-preflight` está 23 commits por delante de `main`; los cambios de esa rama, incluida la corrección del estado `/health`, no forman parte de ese despliegue.

Siguiente verificación segura: ejecutar desde la interfaz de GitHub el workflow existente `AUREA GCP Access Gate` en `main`. Es manual, usa alcance `drive.readonly` y verifica la federación WIF y el acceso al índice sin modificar Drive. No debe sustituirse por un despliegue ni por un flujo de escritura.
