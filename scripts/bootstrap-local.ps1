# AUREA / NODRIZA — Local Windows bootstrap
# Safe setup helper: does not create credentials, modify architecture, or replace Knowledge OS.
$ErrorActionPreference = "Stop"

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Falta $name. $hint"
  }
}

Write-Host "=== AUREA LOCAL BOOTSTRAP ===" -ForegroundColor Cyan
Write-Host "Repository: carlosasantoss73-tech/AUREA"
Write-Host ""

Require-Command "git" "Instala Git for Windows y vuelve a ejecutar este script."
Require-Command "node" "Instala Node.js LTS y vuelve a ejecutar este script."
Require-Command "npm" "npm debe venir con Node.js LTS."

Write-Host ("Git:   " + (& git --version))
Write-Host ("Node:  " + (& node --version))
Write-Host ("npm:   " + (& npm --version))

if (Get-Command python -ErrorAction SilentlyContinue) {
  Write-Host ("Python: " + (& python --version 2>&1))
} else {
  Write-Host "Python: no encontrado (no bloquea la validacion TypeScript actual)." -ForegroundColor Yellow
}

if (-not (Test-Path "package.json")) {
  throw "No se encontro package.json. Ejecuta este script desde la raiz del repositorio AUREA."
}

Write-Host ""
Write-Host "[1/3] Instalando dependencias..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install fallo." }

Write-Host ""
Write-Host "[2/3] Typecheck..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck fallo." }

Write-Host ""
Write-Host "[3/3] Tests..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { throw "npm test fallo." }

Write-Host ""
Write-Host "=== AUREA LOCAL BASELINE: PASS ===" -ForegroundColor Green
Write-Host "El entorno local supera install + typecheck + tests."
Write-Host "No se han creado credenciales ni sustituido Knowledge OS/Bibliotecario."
Write-Host "Siguiente etapa: conectar el entorno local al runtime real y, por separado, resolver WIF/GCP para Bibliotecario LIVE."
