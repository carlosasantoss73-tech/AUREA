# AUREA / NODRIZA — Lanzador único de migración Windows
[CmdletBinding()]
param(
  [string]$Target = "$env:USERPROFILE\AUREA",
  [string]$Branch = "feat/browser-use-runtime-integration-v1",
  [string]$RepoUrl = "https://github.com/carlosasantoss73-tech/AUREA.git"
)
$ErrorActionPreference="Stop"
Write-Host "=== INICIO MIGRACION AUREA / NODRIZA ==="
if(-not (Get-Command git -EA SilentlyContinue)){throw "Git no está instalado."}
if(-not (Get-Command node -EA SilentlyContinue)){throw "Node.js no está instalado."}
$scriptRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrap=Join-Path $scriptRoot "bootstrap-aurea-windows.ps1"
if(-not (Test-Path $bootstrap)){
  throw "Ejecuta este lanzador desde la carpeta tools del repositorio AUREA."
}
& powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrap -RepoUrl $RepoUrl -Target $Target -Branch $Branch
if($LASTEXITCODE -ne 0){throw "Bootstrap detenido con código $LASTEXITCODE."}
$audit=Join-Path $Target "tools\audit-nodriza-pc-15-cells.ps1"
if(-not (Test-Path $audit)){throw "No se encontró el auditor de 15 células en $Target."}
& powershell -NoProfile -ExecutionPolicy Bypass -File $audit -Repo $Target
if($LASTEXITCODE -ne 0){throw "Auditoría detenida con código $LASTEXITCODE."}
Write-Host ""
Write-Host "=== MIGRACION BASE + AUDITORIA 15 CELULAS COMPLETADAS ==="
Write-Host "Reporte: $Target\migration-audit-15-cells.json"
Write-Host "Siguiente decisión: revisar BLOCKED/REVIEW; C15 permanece DEFERRED hasta autorización/configuración del runner."
