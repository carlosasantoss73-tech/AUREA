#!/usr/bin/env bash
set -euo pipefail

BASE_URL="\${AUREA_PILOT_URL:-http://localhost:8787}"
TIMEOUT_SECONDS="\${CONCHITA_HEALTH_TIMEOUT_SECONDS:-60}"
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null 2>&1 || { echo "BLOCKED: node is required." >&2; exit 2; }
command -v npm >/dev/null 2>&1 || { echo "BLOCKED: npm is required." >&2; exit 2; }
command -v npx >/dev/null 2>&1 || { echo "BLOCKED: npx is required." >&2; exit 2; }

if [[ ! -f ".dev.vars" ]]; then
  echo "BLOCKED: .dev.vars is missing. Copy .dev.vars.example to .dev.vars and add the local secrets." >&2
  exit 2
fi

echo "== 1. INSTALL =="
npm install

LOG_FILE="$ROOT_DIR/.conchita-pilot-wrangler.log"
rm -f "$LOG_FILE"

echo "== 2. START WRANGLER =="
npx wrangler dev --local --port 8787 >"$LOG_FILE" 2>&1 &
WRANGLER_PID=$!

cleanup() {
  if kill -0 "$WRANGLER_PID" 2>/dev/null; then
    kill "$WRANGLER_PID" 2>/dev/null || true
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

echo "== 3. WAIT FOR HEALTH =="
deadline=$((SECONDS + TIMEOUT_SECONDS))
healthy=false

while (( SECONDS < deadline )); do
  if curl -fsS "$BASE_URL/health" 2>/dev/null | grep -q '"status":"HEALTHY"'; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != "true" ]]; then
  echo "BLOCKED: Conchita pilot did not become HEALTHY within \${TIMEOUT_SECONDS}s." >&2
  [[ -f "$LOG_FILE" ]] && tail -n 80 "$LOG_FILE"
  exit 3
fi

echo "== 4. EXECUTE PILOT =="
AUREA_PILOT_URL="$BASE_URL" bash "$ROOT_DIR/scripts/run-conchita-pilot.sh"

echo "PILOT LOCAL EXECUTION COMPLETED"
