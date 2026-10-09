param(
  [string]$BaseUrl = "http://localhost:8787"
)

$Token = $env:CONCHITA_PILOT_BOOTSTRAP_TOKEN
if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Error "BLOCKED: CONCHITA_PILOT_BOOTSTRAP_TOKEN is not set."
  exit 2
}

Write-Host "== 1. HEALTH =="
$health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
$health | ConvertTo-Json -Depth 10

if ($health.status -ne "HEALTHY") {
  Write-Error "BLOCKED: pilot health is not HEALTHY."
  exit 3
}

Write-Host "== 2. CREATE SESSION =="
$session = Invoke-RestMethod -Method Post -Uri "$BaseUrl/conchita/v1/session" -Headers @{
  Authorization = "Bearer $Token"
} -ContentType "application/json"
$session | ConvertTo-Json -Depth 10

if ($session.status -ne "COMPLETED" -or [string]::IsNullOrWhiteSpace($session.sessionId)) {
  Write-Error "BLOCKED: session was not created."
  exit 4
}

Write-Host "== 3. SEND PILOT MESSAGE =="
$body = @{
  sessionId = $session.sessionId
  message = "Responde únicamente: PILOT_OK"
  clientRequestId = [guid]::NewGuid().ToString()
  mode = "PERSONAL"
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/conchita/v1/message" -Headers @{
  "Content-Type" = "application/json"
} -ContentType "application/json" -Body $body

$response | ConvertTo-Json -Depth 20

if ($response.status -ne "COMPLETED") {
  Write-Error "BLOCKED: message execution did not complete."
  exit 5
}
if ([string]::IsNullOrWhiteSpace($response.response) -or $response.response.Trim() -ne "PILOT_OK") {
  Write-Error "BLOCKED: expected exact PILOT_OK response; received a different or empty response."
  exit 6
}

Write-Host "PILOT SMOKE TEST PASSED"
