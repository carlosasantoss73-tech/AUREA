param(
  [string]$BaseUrl = "http://localhost:8787",
  [int]$HealthTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "BLOCKED: '$Name' is required."
  }
}

Require-Command "node"
Require-Command "npm"
Require-Command "npx"

if (-not (Test-Path ".dev.vars")) {
  throw "BLOCKED: .dev.vars is missing. Copy .dev.vars.example to .dev.vars and add the local secrets."
}

$bootstrapTokenLine = Get-Content ".dev.vars" | Where-Object { $_ -match '^\s*CONCHITA_PILOT_BOOTSTRAP_TOKEN\s*=' } | Select-Object -First 1
if (-not $bootstrapTokenLine) {
  throw "BLOCKED: CONCHITA_PILOT_BOOTSTRAP_TOKEN is missing from .dev.vars."
}
$env:CONCHITA_PILOT_BOOTSTRAP_TOKEN = ($bootstrapTokenLine -replace '^\s*CONCHITA_PILOT_BOOTSTRAP_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'")
if ([string]::IsNullOrWhiteSpace($env:CONCHITA_PILOT_BOOTSTRAP_TOKEN)) {
  throw "BLOCKED: CONCHITA_PILOT_BOOTSTRAP_TOKEN is empty in .dev.vars."
}

Write-Host "== 1. INSTALL =="
npm install

Write-Host "== 2. START WRANGLER =="
$stdoutPath = Join-Path $root ".conchita-pilot-wrangler.out.log"
$stderrPath = Join-Path $root ".conchita-pilot-wrangler.err.log"
$process = Start-Process -FilePath "npx.cmd" -ArgumentList "wrangler", "dev", "--local", "--port", "8787" -WorkingDirectory $root -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru

try {
  Write-Host "== 3. WAIT FOR HEALTH =="
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
  $healthy = $false

  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
      $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
      if ($health.status -eq "HEALTHY") {
        $healthy = $true
        break
      }
    } catch {
      # Wrangler is still starting.
    }
  }

  if (-not $healthy) {
    Write-Error "BLOCKED: Conchita pilot did not become HEALTHY within $HealthTimeoutSeconds seconds."
    if (Test-Path $stdoutPath) {
      Write-Host "== WRANGLER STDOUT =="
      Get-Content $stdoutPath -Tail 80
    }
    if (Test-Path $stderrPath) {
      Write-Host "== WRANGLER STDERR =="
      Get-Content $stderrPath -Tail 80
    }
    exit 3
  }

  Write-Host "== 4. EXECUTE PILOT =="
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts/run-conchita-pilot.ps1") -BaseUrl $BaseUrl
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "PILOT LOCAL EXECUTION COMPLETED"
}
finally {
  Write-Host "== 5. STOP WRANGLER =="
  if ($process -and -not $process.HasExited) {
    & taskkill /PID $process.Id /T /F 2>$null | Out-Null
  }
  Remove-Item $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
}
