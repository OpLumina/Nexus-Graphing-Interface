@echo off
cd /d "%~dp0\.."
echo === NexusGraph Desktop ===

if not exist frontend\node_modules (
    echo ERROR: frontend\node_modules not found. Run sysops\install.bat first.
    exit /b 1
)

echo.
echo [1/4] Starting backend (Docker)...
docker compose up backend -d
if %errorlevel% neq 0 ( echo ERROR: Docker backend failed to start & exit /b 1 )

echo.
echo [2/4] Starting frontend dev server...
start "NexusGraph-Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo [3/4] Waiting for frontend dev server to be ready...
timeout /t 5 /nobreak > nul

echo.
echo [4/4] Compiling and launching Electron...
call frontend\node_modules\.bin\tsc -p tsconfig.electron.json
if %errorlevel% neq 0 ( echo ERROR: TypeScript compile failed & goto cleanup )

call frontend\node_modules\.bin\electron app\dist\main.js

:cleanup
echo.
echo Shutting down...
taskkill /fi "windowtitle eq NexusGraph-Frontend" /f /t > nul 2>&1
docker compose down
