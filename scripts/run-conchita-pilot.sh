#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${AUREA_PILOT_URL:-http://localhost:8787}"
BOOTSTRAP_TOKEN="${CONCHITA_PILOT_BOOTSTRAP_TOKEN:-}"

if [[ -z "$BOOTSTRAP_TOKEN" ]]; then
  echo "BLOCKED: CONCHITA_PILOT_BOOTSTRAP_TOKEN is not set."
  exit 2
fi

echo "== 1. HEALTH =="
curl -fsS "$BASE_URL/health"
echo
echo

echo "== 2. CREATE SESSION =="
SESSION_JSON="$(curl -fsS -X POST "$BASE_URL/conchita/v1/session"   -H "Authorization: Bearer $BOOTSTRAP_TOKEN"   -H "Content-Type: application/json")"
echo "$SESSION_JSON"
echo

SESSION_ID="$(printf '%s' "$SESSION_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);if(j.status!=='COMPLETED'||!j.sessionId)process.exit(3);process.stdout.write(j.sessionId)})")"

echo "== 3. SEND PILOT MESSAGE =="
CLIENT_REQUEST_ID="$(node -e "console.log(crypto.randomUUID())")"
curl -fsS -X POST "$BASE_URL/conchita/v1/message"   -H "Authorization: Bearer $BOOTSTRAP_TOKEN"   -H "Content-Type: application/json"   -d "{"sessionId":"$SESSION_ID","message":"Responde únicamente: PILOT_OK","clientRequestId":"$CLIENT_REQUEST_ID","mode":"PERSONAL"}"
echo
echo
echo "PILOT REQUEST COMPLETED"
