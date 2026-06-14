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

echo ""
echo "Done. Run ./sysops/run-desktop.sh to launch the desktop app."
echo "To remove dependencies and build artifacts, run ./sysops/uninstall.sh."
