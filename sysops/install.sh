#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== NexusGraph Install ==="

echo ""
echo "Installing all dependencies..."
cd frontend
# npm ci installs exactly what's in package-lock.json (reproducible, no silent
# version drift) and fails fast if package.json and the lockfile disagree (ENV-5).
npm ci
cd ..

if [[ "$(uname)" == "Linux" ]]; then
  echo ""
  echo "Configuring Electron sandbox (requires sudo on Linux)..."
  # Electron's binary is downloaded by its post-install script; run it explicitly
  # to ensure chrome-sandbox exists before we set ownership.
  (cd frontend && node node_modules/electron/install.js 2>/dev/null || true)
  SANDBOX="frontend/node_modules/electron/dist/chrome-sandbox"
  if [ -f "$SANDBOX" ] && [ ! -L "$SANDBOX" ]; then
    sudo chown root:root "$SANDBOX"
    sudo chmod 4755 "$SANDBOX"
    echo "Sandbox configured."
  else
    echo "WARNING: chrome-sandbox not found at $SANDBOX — skipping."
  fi
fi

echo ""
echo "Done. Run ./sysops/run-desktop.sh to launch the desktop app."
echo "To remove dependencies and build artifacts, run ./sysops/uninstall.sh."
