#!/bin/bash
cd "$(dirname "$0")/.."
echo "=== NexusGraph Force Shutdown ==="

echo ""
echo "Stopping Docker containers..."
docker compose down

echo ""
echo "Killing Electron..."
pkill -f "electron app/dist/main.js" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true

echo ""
echo "Killing frontend dev server (vite/npm)..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo ""
echo "Done."
