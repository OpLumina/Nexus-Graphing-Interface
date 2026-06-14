#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== NexusGraph Desktop ==="

# SEC-5: per-session shared token. Exported to both the backend (via docker
# compose) and the Vite proxy (process.env), so /compute only answers calls that
# carry the matching X-Nexus-Token header — no other local process can reach it.
export NEXUS_API_TOKEN="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)"

cleanup() {
  echo ""
  echo "Shutting down..."
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    pkill -P "$FRONTEND_PID" 2>/dev/null || true
  fi
  docker compose down
}
trap cleanup EXIT INT TERM

if [ ! -d frontend/node_modules ]; then
    echo "ERROR: frontend/node_modules not found. Run ./sysops/install.sh first."
    exit 1
fi

echo ""
echo "[1/4] Starting backend (Docker)..."
docker compose up backend -d

echo ""
echo "[2/4] Starting frontend dev server..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "[3/4] Waiting for frontend dev server to be ready..."
sleep 5

echo ""
echo "[4/4] Compiling and launching Electron..."
./node_modules/.bin/tsc -p tsconfig.electron.json
./node_modules/.bin/electron app/dist/main.js
