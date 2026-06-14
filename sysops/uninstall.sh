#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== NexusGraph Uninstall ==="

echo ""
echo "Removing frontend dependencies..."
if [ -d frontend/node_modules ]; then
    SANDBOX="frontend/node_modules/electron/dist/chrome-sandbox"
    if [ -f "$SANDBOX" ] && [ "$(stat -c '%u' "$SANDBOX" 2>/dev/null)" = "0" ]; then
      sudo rm -rf frontend/node_modules
    else
      rm -rf frontend/node_modules
    fi
    echo "Removed frontend/node_modules"
else
    echo "frontend/node_modules not found, skipping"
fi

echo ""
echo "Removing build artifacts..."
if [ -d frontend/dist ]; then
    rm -rf frontend/dist
    echo "Removed frontend/dist"
fi
if [ -d app/dist ]; then
    rm -rf app/dist
    echo "Removed app/dist"
fi

echo ""
echo "Done. Run ./sysops/install.sh to reinstall."
