# AUREA / NODRIZA — EJECUCIÓN DE CIERRE
Fecha: 2026-09-27

## Objetivo
Completar la ruta de cierre sin reconstruir AUREA:
1. Baseline real en PC Windows.
2. WIF + lectura institucional real del Bibliotecario.
3. Continuidad/recovery.
4. Auditoría final.

## Estado
- Arquitectura interna: cerrada para esta fase.
- PR #147: MERGED.
- Bibliotecario: contrato y gate implementados; lectura institucional real pendiente de WIF.
- PC: automatización preparada; ejecución física pendiente.
- Cloud: workflow fail-closed preparado; activación pendiente de WIF.
- No se deben registrar secretos en chat, código, reportes ni commits.

## PASO 1 — PC
En PowerShell:
```powershell
cd "$env:USERPROFILE\AUREA\tools"
powershell -ExecutionPolicy Bypass -File .\run-nodriza-migration.ps1
```

Resultado requerido:
- C01–C14 sin BLOCKED.
- C15 puede quedar DEFERRED.
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

## PASO 3 — CONTINUIDAD / RECOVERY
Con WIF validado:
- ejecutar `AUREA Cloud Continuity`;
- confirmar baseline Node/typecheck/tests;
- confirmar `CLOUD_DEPLOYMENT=READY` cuando corresponda;
- probar recuperación desde un segundo entorno.

No desplegar un runtime cloud adicional antes de validar WIF y recovery.

## PASO 4 — CIERRE
Repetir suite completa, auditoría de seguridad y documentación final.

## Regla de cierre
No declarar 100% mientras falte cualquiera de:
PC baseline real, WIF autenticado, lectura institucional real, E2E institucional, continuidad o recuperación desde otro entorno.