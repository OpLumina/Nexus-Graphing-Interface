#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== NexusGraph Desktop ==="

# SEC-5: per-session shared token. Exported to both the backend (via docker
# compose) and the Vite proxy (process.env), so /compute only answers calls that
# carry the matching X-Nexus-Token header — no other local process can reach it.
export NEXUS_API_TOKEN="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)"

# The dev server and Electron must agree on the port. Electron loads NEXUS_DEV_URL
# (app/main.ts) and Vite binds this port with strictPort, so they can never drift
# onto different servers — which previously left Electron talking to a stale
# orphan and crashing Rolldown with "Failed to get current dir".
DEV_PORT=5173
export NEXUS_DEV_URL="http://localhost:${DEV_PORT}"

# Kill any stale dev server squatting on the port (e.g. an orphan from a previous
# run whose working dir was since deleted). Leaving it alive both blocks our
# strictPort bind and, if reached, triggers the Rolldown current-dir panic.
free_port() {
  local pids
  pids="$(ss -ltnpH "sport = :${DEV_PORT}" 2>/dev/null \
    | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)"
  if [ -n "$pids" ]; then
    echo "Port ${DEV_PORT} in use by PID(s) $pids — stopping stale dev server..."
    kill $pids 2>/dev/null || true
    sleep 1
  fi
}

cleanup() {
  echo ""
  echo "Shutting down..."
  if [ -n "$FRONTEND_PGID" ]; then
    # The dev server runs in its own process group (setsid below). Signalling the
    # negative PGID tears down the whole tree — npx, node and the vite worker
    # threads — instead of orphaning the real server like a bare `kill` did. The
    # group leader records its own PID so this works regardless of whether setsid
    # forks (it does when the launcher's background job is itself a group leader).
    kill -- -"$FRONTEND_PGID" 2>/dev/null || true
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
FRONTEND_DIR="$(pwd)/frontend"
free_port
# setsid puts vite in its own session/process group so cleanup() can kill the
# entire tree. The leader writes its own PID (== PGID) to PGID_FILE before exec'ing
# vite, so cleanup targets the right group even when setsid forks.
PGID_FILE="$(mktemp)"
setsid bash -c 'echo $$ >"$2"; cd "$1" && exec npx vite' _ "$FRONTEND_DIR" "$PGID_FILE" &
for _ in $(seq 1 40); do [ -s "$PGID_FILE" ] && break; sleep 0.1; done
FRONTEND_PGID="$(cat "$PGID_FILE" 2>/dev/null)"
rm -f "$PGID_FILE"

echo ""
echo "[3/4] Waiting for frontend dev server to be ready..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$NEXUS_DEV_URL"; then break; fi
  if [ -n "$FRONTEND_PGID" ] && ! kill -0 "-$FRONTEND_PGID" 2>/dev/null; then
    echo "ERROR: frontend dev server exited before becoming ready (port ${DEV_PORT} taken?)."
    exit 1
  fi
  sleep 0.5
done

echo ""
echo "[4/4] Compiling and launching Electron..."
(cd frontend && npx tsc -p ../tsconfig.electron.json)
(cd frontend && npx electron ../app/dist/main.js)
