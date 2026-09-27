# AUREA / NODRIZA — EJECUCIÓN DE CIERRE

Fecha: 2026-09-27

## Objetivo
Completar la ruta de cierre sin reconstruir AUREA:
1. Baseline real en PC Windows.
2. WIF + lectura institucional real del Bibliotecario.
3. Continuidad cloud.
4. Auditoría final y recuperación desde otro equipo.

## Estado
- Arquitectura interna: cerrada para esta fase.
- Workflows internos críticos: verificados en CI en el último head auditado.
- Bibliotecario: contrato y gate implementados; lectura institucional real pendiente de WIF.
- PC: automatización preparada; ejecución física pendiente en la PC del usuario.
- Cloud: workflow fail-closed preparado; activación pendiente de WIF.
- No se deben registrar secretos en chat, código, reportes ni commits.

## PASO 1 — PC
En PowerShell:
```powershell
cd "$env:USERPROFILE\AUREA\tools"
powershell -ExecutionPolicy Bypass -File .\run-nodriza-migration.ps1
```

Si AUREA todavía no existe:
```powershell
git clone --branch feat/browser-use-runtime-integration-v1 https://github.com/carlosasantoss73-tech/AUREA.git "$env:USERPROFILE\AUREA"
cd "$env:USERPROFILE\AUREA\tools"
powershell -ExecutionPolicy Bypass -File .\run-nodriza-migration.ps1
```

Resultado requerido:
- C01–C14 sin BLOCKED.
- C15 puede quedar DEFERRED hasta decidir self-hosted runner.
- Entregar `%USERPROFILE%\AUREA\migration-audit-15-cells.json`.

## PASO 2 — WIF / BIBLIOTECARIO
Configurar en GitHub Actions, sin publicar valores:
- `AUREA_GCP_WIF_PROVIDER`
- `AUREA_GCP_SERVICE_ACCOUNT`

Después ejecutar manualmente:
`AUREA Knowledge OS v011 Live Reader Probe`

Evidencia requerida:
- WIF authenticated.
- Lectura del índice institucional v011.
- SHA-256 del contenido leído.
- `V011_CONTENT_PROBE: PASS`.

No se acepta LOCAL_SEED como sustituto.

## PASO 3 — CLOUD
Con WIF validado:
- ejecutar `AUREA Cloud Continuity`;
- confirmar baseline Node/typecheck/tests;
- confirmar `CLOUD_DEPLOYMENT=READY`;
- solo después elegir y desplegar el runtime cloud mínimo.

No desplegar un runtime cloud antes de validar WIF.

## PASO 4 — CIERRE
Repetir:
- suite completa;
- auditoría de seguridad;
- prueba de recuperación desde un segundo equipo;
- verificación de GitHub PR;
- documentación final;
- merge únicamente cuando la evidencia cumpla la definición de cierre.

## Regla de cierre
AUREA no se declara 100% cerrada mientras falte cualquiera de:
PC baseline real, WIF autenticado, lectura institucional real, E2E institucional, continuidad cloud o recuperación desde otro equipo.
