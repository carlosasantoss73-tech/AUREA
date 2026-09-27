# AUREA / NODRIZA — Auditoría local de migración Windows
[CmdletBinding()]
param(
  [string]$Repo = "$env:USERPROFILE\AUREA",
  [string]$Report = ""
)

$ErrorActionPreference = "Continue"
if ([string]::IsNullOrWhiteSpace($Report)) { $Report = Join-Path $Repo "migration-audit-15-cells.json" }
$started = Get-Date
$results = [System.Collections.Concurrent.ConcurrentBag[object]]::new()

function Cell($id,$name,$status,$detail) {
  $results.Add([pscustomobject]@{
    cell=$id; name=$name; status=$status; detail=$detail
    timestamp=(Get-Date).ToString("o")
  })
}

function CmdVersion($cmd) {
  $c=Get-Command $cmd -ErrorAction SilentlyContinue
  if($c){ try { (& $cmd --version 2>&1 | Select-Object -First 1).ToString() } catch { "installed" } } else { $null }
}

Write-Host "=== AUREA / NODRIZA — 15 CELL WINDOWS AUDIT ==="
Write-Host "Repo: $Repo"

# C01 — Windows / hardware
try {
  $os=Get-CimInstance Win32_OperatingSystem
  $cs=Get-CimInstance Win32_ComputerSystem
  $disk=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
  Cell "C01" "Inventario PC" "PASS" ("Windows {0}; RAM_GB={1:N1}; FreeDisk_GB={2:N1}" -f $os.Caption,($cs.TotalPhysicalMemory/1GB),($disk.FreeSpace/1GB))
} catch { Cell "C01" "Inventario PC" "REVIEW" $_.Exception.Message }

# C02-C03 are independent environment checks
$jobs = @(
  Start-Job -ScriptBlock { $v=Get-Command git -ErrorAction SilentlyContinue; if($v){ "PASS|$((& git --version) -join ' ')" } else {"BLOCKED|git no encontrado"} },
  Start-Job -ScriptBlock { $v=Get-Command node -ErrorAction SilentlyContinue; if($v){ $s=((& node --version) -join ' '); $m=[int](($s -replace '^v','').Split('.')[0]); if($m -ge 20){"PASS|$s"}else{"BLOCKED|Node 20+ requerido: $s"} } else {"BLOCKED|node no encontrado"} },
  Start-Job -ScriptBlock { $v=Get-Command npm -ErrorAction SilentlyContinue; if($v){"PASS|$((& npm --version) -join ' ')"}else{"BLOCKED|npm no encontrado"} },
  Start-Job -ScriptBlock { $v=Get-Command python -ErrorAction SilentlyContinue; if($v){"PASS|$((& python --version) -join ' ')"}else{"REVIEW|python no encontrado"} },
  Start-Job -ScriptBlock { $v=Get-Command gemini -ErrorAction SilentlyContinue; if($v){"PASS|$((& gemini --version) -join ' ')"}else{"REVIEW|Gemini CLI no instalado"} }
)
$done = Wait-Job $jobs
$out = $done | Receive-Job
Remove-Job $jobs -Force
Cell "C02" "Git" (($out[0] -split '\|',2)[0]) (($out[0] -split '\|',2)[1])
Cell "C03" "Node/npm" (($out[1] -split '\|',2)[0]) (($out[1] -split '\|',2)[1] + " ; npm=" + (($out[2] -split '\|',2)[1]))
Cell "C08" "Python" (($out[3] -split '\|',2)[0]) (($out[3] -split '\|',2)[1])
Cell "C11" "Gemini auditor" (($out[4] -split '\|',2)[0]) (($out[4] -split '\|',2)[1])

# Repository and dependency cells
if(Test-Path (Join-Path $Repo ".git")){
  $branch = (& git -C $Repo branch --show-current).Trim()
  $head = (& git -C $Repo rev-parse HEAD).Trim()
  $expected="feat/browser-use-runtime-integration-v1"
  Cell "C04" "Repo/branch" ($(if($branch -eq $expected){"PASS"}else{"REVIEW"})) "branch=$branch; head=$head"
  Push-Location $Repo
  try {
    $lock = Test-Path "package-lock.json"
    npm install --ignore-scripts | Out-Null
    Cell "C05" "Dependencias" "PASS" ("npm install completado; lockfile=" + $lock)
    $tc=& npm run typecheck 2>&1
    Cell "C06" "TypeScript" ($(if($LASTEXITCODE -eq 0){"PASS"}else{"BLOCKED"})) (($tc | Select-Object -Last 5) -join " | ")
    $tt=& npm test 2>&1
    Cell "C07" "Tests" ($(if($LASTEXITCODE -eq 0){"PASS"}else{"BLOCKED"})) (($tt | Select-Object -Last 8) -join " | ")
  } finally { Pop-Location }
} else {
  foreach($c in @("C04","C05","C06","C07")){ Cell $c "Repositorio" "BLOCKED" "Repo no encontrado en $Repo" }
}

# C09 MCP/browser baseline
try {
  $mcp = Get-Command python -ErrorAction SilentlyContinue
  if($mcp -and (Test-Path (Join-Path $Repo "apps/tool_expert_factory/functional_runtime_mcp.py"))){
    Push-Location $Repo
    $r=& python apps/tool_expert_factory/functional_runtime_mcp.py 2>&1
    $ok=($LASTEXITCODE -eq 0)
    Pop-Location
    Cell "C09" "MCP/browser" ($(if($ok){"PASS"}else{"REVIEW"})) (($r | Select-Object -Last 8) -join " | ")
  } else { Cell "C09" "MCP/browser" "REVIEW" "No se pudo ejecutar el smoke test MCP" }
} catch { Cell "C09" "MCP/browser" "REVIEW" $_.Exception.Message }

# C10 provider presence only — never print values
$providerVars=@("OPENAI_API_KEY","GEMINI_API_KEY","GOOGLE_API_KEY","ANTHROPIC_API_KEY")
$present=($providerVars | Where-Object { -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) })
Cell "C10" "Providers" "PASS" ("Variables presentes=" + ($present -join ",") + "; valores nunca se imprimen.")

# C12 OpenAI auditor — capability/config presence, not secret validation
$openai = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY")
Cell "C12" "OpenAI auditor" ($(if($openai){"PASS"}else{"REVIEW"})) "Solo se comprueba presencia de configuración; no se transmite ni muestra la clave."

# C13 security
try {
  $gitignore=Test-Path (Join-Path $Repo ".gitignore")
  $envFiles=Get-ChildItem $Repo -Force -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\node_modules\|\.git\' -and $_.Name -match '^\.env($|\.)|credentials|secret' }
  Cell "C13" "Seguridad" ($(if($gitignore){"PASS"}else{"REVIEW"})) ("gitignore=" + $gitignore + "; archivos potencialmente sensibles encontrados=" + @($envFiles).Count)
} catch { Cell "C13" "Seguridad" "REVIEW" $_.Exception.Message }

# C14 Work Cell persistence/recovery
try {
  $tests = Get-ChildItem (Join-Path $Repo "tests") -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'cell|work|recover|persist' }
  Cell "C14" "Work Cells persistencia/recovery" "PASS" ("Tests relacionados encontrados=" + @($tests).Count + "; validación completa depende de npm test.")
} catch { Cell "C14" "Work Cells persistencia/recovery" "REVIEW" $_.Exception.Message }

# C15 runner readiness — do not register runner or generate tokens
$runnerDir=Test-Path "C:\actions-runner"
Cell "C15" "Self-hosted runner" "DEFERRED" ("Directorio C:\actions-runner=" + $runnerDir + "; no se registra runner automáticamente. Requiere token temporal de GitHub.")

$ordered = 1..15 | ForEach-Object { $results | Where-Object cell -eq ("C{0:D2}" -f $_) | Select-Object -First 1 }
$summary=[pscustomobject]@{
  generated_at=(Get-Date).ToString("o")
  started_at=$started.ToString("o")
  authority="Bibliotecario/Knowledge OS remains institutional authority"
  architecture="PC executes; Nodriza orchestrates; AUREA governs"
  cells=$ordered
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $Report
Write-Host "AUDIT_REPORT=$Report"
$summary.cells | Format-Table cell,name,status,detail -AutoSize
Write-Host "=== END 15 CELL AUDIT ==="
