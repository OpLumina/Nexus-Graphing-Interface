#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== NexusGraph Install ==="

echo ""
echo "Installing all dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Done. Run ./sysops/run-desktop.sh to launch the desktop app."
echo "To remove dependencies and build artifacts, run ./sysops/uninstall.sh."
