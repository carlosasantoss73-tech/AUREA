# AUREA / NODRIZA — Ejecución PC en un paso

## Objetivo
Ejecutar el bootstrap y después la auditoría de las 15 células sin reconstruir AUREA.

## Regla de autoridad
Bibliotecario / Knowledge OS sigue siendo la autoridad institucional. La PC es nodo de ejecución; Nodriza coordina; AUREA gobierna.

## Ejecución
Desde una copia local del repositorio, en PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\tools\run-nodriza-migration.ps1
```

El proceso:
1. valida Git y Node;
2. clona/actualiza la rama objetivo sin sobrescribir trabajo no versionado;
3. instala dependencias;
4. ejecuta typecheck y tests;
5. ejecuta las comprobaciones locales de las 15 células;
6. genera `migration-audit-15-cells.json`.

## Interpretación
- PASS = evidencia local positiva.
- REVIEW = requiere revisión humana o falta una capacidad opcional.
- BLOCKED = no continuar con la siguiente etapa dependiente.
- DEFERRED = deliberadamente no ejecutado todavía.

Nunca se muestran ni se almacenan valores de secretos.

## C15
El self-hosted runner no se registra automáticamente. Su configuración requiere el token temporal proporcionado por GitHub y una acción humana en la PC.
