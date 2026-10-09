#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${AUREA_PILOT_URL:-http://localhost:8787}"
BOOTSTRAP_TOKEN="${CONCHITA_PILOT_BOOTSTRAP_TOKEN:-}"

if [[ -z "$BOOTSTRAP_TOKEN" ]]; then
  echo "BLOCKED: CONCHITA_PILOT_BOOTSTRAP_TOKEN is not set." >&2
  exit 2
fi

echo "== 1. HEALTH =="
HEALTH_JSON="$(curl -fsS "$BASE_URL/health")"
printf '%s\n' "$HEALTH_JSON"
printf '%s' "$HEALTH_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);if(j.status!=="HEALTHY")process.exit(3)}catch{process.exit(3)}})'

echo
echo "== 2. CREATE SESSION =="
SESSION_JSON="$(curl -fsS -X POST "$BASE_URL/conchita/v1/session" \
  -H "Authorization: Bearer $BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json")"
printf '%s\n' "$SESSION_JSON"

SESSION_ID="$(printf '%s' "$SESSION_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);if(j.status!=="COMPLETED"||!j.sessionId)process.exit(4);process.stdout.write(j.sessionId)}catch{process.exit(4)}})')"

echo
echo "== 3. SEND PILOT MESSAGE =="
CLIENT_REQUEST_ID="$(node -e 'console.log(crypto.randomUUID())')"
MESSAGE_BODY="$(node -e 'const [sessionId, clientRequestId] = process.argv.slice(1); process.stdout.write(JSON.stringify({sessionId, message:"Responde únicamente: PILOT_OK", clientRequestId, mode:"PERSONAL"}))' "$SESSION_ID" "$CLIENT_REQUEST_ID")"
MESSAGE_RESPONSE="$(curl -fsS -X POST "$BASE_URL/conchita/v1/message" \
  -H "Content-Type: application/json" \
  -d "$MESSAGE_BODY")"

printf '%s' "$MESSAGE_RESPONSE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);if(j.status!=="COMPLETED"||typeof j.response!=="string"||j.response.trim()!=="PILOT_OK"){console.error("BLOCKED: expected COMPLETED response with exact PILOT_OK output.");console.error(JSON.stringify({status:j.status,response:j.response??null,error:j.error??null},null,2));process.exit(5)}console.log(JSON.stringify(j,null,2))}catch(e){console.error("BLOCKED: invalid JSON response.");process.exit(5)}})'

echo
echo "PILOT SMOKE TEST PASSED"
