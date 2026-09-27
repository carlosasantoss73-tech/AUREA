# AUREA / NODRIZA — Bootstrap Windows
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\tools\bootstrap-aurea-windows.ps1
# Opcional:
#   -RepoUrl "https://github.com/carlosasantoss73-tech/AUREA.git"
#   -Target "C:\AUREA"

[CmdletBinding()]
param(
  [string]$RepoUrl = "https://github.com/carlosasantoss73-tech/AUREA.git",
  [string]$Target = "$env:USERPROFILE\AUREA"
)

$ErrorActionPreference = "Stop"
$report = Join-Path $Target "migration-report.txt"

function Check-Cmd($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $true }
  Write-Host "[BLOCKED] $name no está instalado o no está en PATH."
  return $false
}

Write-Host "=== AUREA / NODRIZA PC BOOTSTRAP ==="
Write-Host "Target: $Target"

New-Item -ItemType Directory -Force -Path $Target | Out-Null
" AUREA migration report $(Get-Date -Format o)" | Out-File $report

$gitOk = Check-Cmd "git"
$nodeOk = Check-Cmd "node"
$npmOk = Check-Cmd "npm"

if ($gitOk) { git --version | Tee-Object -FilePath $report -Append }
if ($nodeOk) { node --version | Tee-Object -FilePath $report -Append }
if ($npmOk) { npm --version | Tee-Object -FilePath $report -Append }

if (-not ($gitOk -and $nodeOk -and $npmOk)) {
  Write-Host "[NO-GO] Instala Git y Node.js 20+ y vuelve a ejecutar."
  exit 2
}

$nodeMajor = [int]((node --version) -replace '^v','').Split('.')[0]
if ($nodeMajor -lt 20) {
  Write-Host "[NO-GO] Node.js 20+ es requerido."
  exit 3
}

if (-not (Test-Path (Join-Path $Target ".git"))) {
  Write-Host "[C04] Clonando repositorio..."
  git clone $RepoUrl $Target
} else {
  Write-Host "[C04] Repositorio existente; actualizando de forma no destructiva..."
  git -C $Target fetch --all --prune
}

Set-Location $Target

Write-Host "[C05] Instalando dependencias..."
npm install

Write-Host "[C06] Typecheck..."
npm run typecheck

Write-Host "[C07] Tests..."
npm test

Write-Host "[C13] Revisando archivos de secretos..."
$bad = Get-ChildItem -Force -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\node_modules\|\.git\' -and $_.Name -match '^\.env($|\.)|secret|credential' }
if ($bad) {
  Write-Host "[REVIEW] Se encontraron nombres potencialmente sensibles; no se muestran contenidos."
  $bad.FullName | Out-File $report -Append
} else {
  Write-Host "[PASS] No se detectaron nombres de archivos sensibles."
}

Write-Host ""
Write-Host "=== BOOTSTRAP BASELINE PASS ==="
Write-Host "Repositorio: $Target"
Write-Host "Siguiente: ejecutar las células C08-C15 y no registrar secretos."
"BASELINE_PASS $(Get-Date -Format o)" | Out-File $report -Append
