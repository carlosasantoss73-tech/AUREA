# AUREA / NODRIZA — Auditoría local Windows de 15 células
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
  $results.Add([pscustomobject]@{cell=$id;name=$name;status=$status;detail=$detail;timestamp=(Get-Date).ToString("o")})
}
function JobCheck($id,$name,$script) {
  Start-Job -ScriptBlock { param($Id,$Name,$Script)
    try { $value = & ([scriptblock]::Create($Script)); "$Id|$Name|$value" }
    catch { "$Id|$Name|REVIEW|$($_.Exception.Message)" }
  } -ArgumentList $id,$name,$script
}

Write-Host "=== AUREA / NODRIZA — 15 CELL WINDOWS AUDIT ==="
Write-Host "Repo: $Repo"

try {
  $os=Get-CimInstance Win32_OperatingSystem
  $cs=Get-CimInstance Win32_ComputerSystem
  $disk=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
  Cell "C01" "Inventario PC" "PASS" ("OS={0}; RAM_GB={1:N1}; FreeDisk_GB={2:N1}" -f $os.Caption,($cs.TotalPhysicalMemory/1GB),($disk.FreeSpace/1GB))
} catch { Cell "C01" "Inventario PC" "REVIEW" $_.Exception.Message }

# C02/C03/C08/C11 are independent and execute concurrently.
$jobs=@(
  JobCheck "C02" "Git" 'if(Get-Command git -EA SilentlyContinue){"PASS|"+((& git --version) -join " ")}else{"BLOCKED|git no encontrado"}',
  JobCheck "C03A" "Node" 'if(Get-Command node -EA SilentlyContinue){$s=((& node --version) -join " ");$m=[int](($s-replace "^v","").Split(".")[0]);if($m-ge 20){"PASS|"+$s}else{"BLOCKED|Node 20+ requerido: "+$s}}else{"BLOCKED|node no encontrado"}',
  JobCheck "C03B" "npm" 'if(Get-Command npm -EA SilentlyContinue){"PASS|"+((& npm --version) -join " ")}else{"BLOCKED|npm no encontrado"}',
  JobCheck "C08" "Python" 'if(Get-Command python -EA SilentlyContinue){"PASS|"+((& python --version) -join " ")}else{"REVIEW|python no encontrado"}',
  JobCheck "C11" "Gemini auditor" 'if(Get-Command gemini -EA SilentlyContinue){"PASS|"+((& gemini --version) -join " ")}else{"REVIEW|Gemini CLI no instalado (opcional)"}'
)
Wait-Job $jobs | Out-Null
foreach($j in $jobs){
  $line=Receive-Job $j | Select-Object -Last 1
  Remove-Job $j -Force
  $p=$line -split "\|",4
  if($p[0] -eq "C03A"){ Cell "C03" "Node/npm" $p[2] ("Node="+$p[3]) }
  elseif($p[0] -eq "C03B"){ Cell "C03NPM" "npm" $p[2] $p[3] }
  else { Cell $p[0] $p[1] $p[2] $p[3] }
}

if(Test-Path (Join-Path $Repo ".git")){
  $branch=(& git -C $Repo branch --show-current).Trim()
  $head=(& git -C $Repo rev-parse HEAD).Trim()
  $expected="feat/browser-use-runtime-integration-v1"
  Cell "C04" "Repo/branch" ($(if($branch -eq $expected){"PASS"}else{"REVIEW"})) "branch=$branch; head=$head"
  Push-Location $Repo
  try {
    $lock=Test-Path "package-lock.json"
    npm install --ignore-scripts | Out-Null
    $installOk=($LASTEXITCODE -eq 0)
    Cell "C05" "Dependencias" ($(if($installOk){"PASS"}else{"BLOCKED"})) ("npm install exit="+$LASTEXITCODE+"; lockfile="+$lock)
    $tc=& npm run typecheck 2>&1; $tcCode=$LASTEXITCODE
    Cell "C06" "TypeScript" ($(if($tcCode -eq 0){"PASS"}else{"BLOCKED"})) (($tc|Select-Object -Last 6)-join " | ")
    $tt=& npm test 2>&1; $ttCode=$LASTEXITCODE
    Cell "C07" "Tests" ($(if($ttCode -eq 0){"PASS"}else{"BLOCKED"})) (($tt|Select-Object -Last 10)-join " | ")
  } finally { Pop-Location }
} else {
  foreach($c in @("C04","C05","C06","C07")){Cell $c "Repositorio" "BLOCKED" "Repo no encontrado: $Repo"}
}

try {
  $py=Get-Command python -EA SilentlyContinue
  $script=Join-Path $Repo "apps/tool_expert_factory/functional_runtime_mcp.py"
  if($py -and (Test-Path $script)){
    Push-Location $Repo
    $r=& python $script 2>&1; $code=$LASTEXITCODE
    Pop-Location
    Cell "C09" "MCP/browser" ($(if($code -eq 0){"PASS"}else{"REVIEW"})) (($r|Select-Object -Last 8)-join " | ")
  } else { Cell "C09" "MCP/browser" "REVIEW" "Smoke test no ejecutable." }
} catch { Cell "C09" "MCP/browser" "REVIEW" $_.Exception.Message }

$providerVars=@("OPENAI_API_KEY","GEMINI_API_KEY","GOOGLE_API_KEY","ANTHROPIC_API_KEY")
$present=@($providerVars|Where-Object{-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))})
Cell "C10" "Providers" ($(if($present.Count -gt 0){"PASS"}else{"REVIEW"})) ("Configuraciones locales presentes="+$present.Count+"; valores nunca se imprimen.")

$openai=[Environment]::GetEnvironmentVariable("OPENAI_API_KEY")
Cell "C12" "OpenAI auditor" ($(if($openai){"PASS"}else{"REVIEW"})) "La ausencia de OPENAI_API_KEY no bloquea conectores externos; no se transmite ni muestra ninguna clave."

try {
  $gitignore=Test-Path (Join-Path $Repo ".gitignore")
  $envFiles=@(Get-ChildItem $Repo -Force -Recurse -File -EA SilentlyContinue|Where-Object{$_.FullName -notmatch "\node_modules\|\.git\" -and $_.Name -match "^\.env($|\.)|credentials|secret|\.pem$|\.key$"})
  $status=$(if($gitignore -and $envFiles.Count -eq 0){"PASS"}else{"REVIEW"})
  Cell "C13" "Seguridad" $status ("gitignore="+$gitignore+"; archivos potencialmente sensibles="+$envFiles.Count)
} catch { Cell "C13" "Seguridad" "REVIEW" $_.Exception.Message }

try {
  $tests=@(Get-ChildItem (Join-Path $Repo "tests") -Recurse -File -EA SilentlyContinue|Where-Object{$_.Name -match "cell|work|recover|persist"})
  $testCell=$results|Where-Object{$_.cell -eq "C07"}|Select-Object -First 1
  $status=$(if($testCell.status -eq "PASS" -and $tests.Count -gt 0){"PASS"}else{"REVIEW"})
  Cell "C14" "Work Cells persistencia/recovery" $status ("Tests relacionados encontrados="+$tests.Count+"; evidencia de ejecución completa="+$testCell.status)
} catch { Cell "C14" "Work Cells persistencia/recovery" "REVIEW" $_.Exception.Message }

$runnerDir=Test-Path "C:\actions-runner"
Cell "C15" "Self-hosted runner" "DEFERRED" ("C:\actions-runner="+$runnerDir+"; registro requiere token temporal de GitHub y acción humana.")

$ordered=1..15|ForEach-Object{$id="C{0:D2}"-f $_;$results|Where-Object cell -eq $id|Select-Object -First 1}
$summary=[pscustomobject]@{
 generated_at=(Get-Date).ToString("o");started_at=$started.ToString("o")
 authority="Bibliotecario/Knowledge OS remains institutional authority"
 architecture="PC executes; Nodriza orchestrates; AUREA governs"
 cells=$ordered
}
$summary|ConvertTo-Json -Depth 8|Set-Content -Encoding UTF8 $Report
Write-Host "AUDIT_REPORT=$Report"
$summary.cells|Format-Table cell,name,status,detail -AutoSize
Write-Host "=== END 15 CELL AUDIT ==="
