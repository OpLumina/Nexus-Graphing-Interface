@echo off
cd /d "%~dp0\.."
echo === NexusGraph Force Shutdown ===

echo.
echo Stopping Docker containers...
docker compose down

echo.
echo Killing Electron...
taskkill /im electron.exe /f /t > nul 2>&1

echo.
echo Killing frontend dev server (vite/npm)...
taskkill /fi "windowtitle eq NexusGraph-Frontend" /f /t > nul 2>&1
taskkill /im node.exe /f /t > nul 2>&1

echo.
echo Done.
