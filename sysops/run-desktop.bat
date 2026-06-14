@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
set "ROOT=%CD%"

:: ── helpers ────────────────────────────────────────────────────────────────
:: Show a MessageBox error dialog then jump to a label.
:: Usage: call :msgbox "Text" && goto <label>
:: (We define this as a subroutine at the bottom)

:: ── pre-flight ─────────────────────────────────────────────────────────────
if not exist "frontend\node_modules" (
    call :msgbox "Dependencies not found.^n^nRun sysops\install.bat first."
    exit /b 1
)

:: Check Docker daemon is reachable before touching anything
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :msgbox "Failed to connect to the Docker API.^n^nEnsure Docker Desktop is running and try again."
    exit /b 1
)

:: ── shared API token (SEC-5) ───────────────────────────────────────────────
:: Per-session token exported to both the backend (via docker compose) and the
:: Vite proxy (it inherits this env), so /compute only answers calls carrying a
:: matching X-Nexus-Token header — no other local process can reach it.
for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set "NEXUS_API_TOKEN=%%i"

:: ── backend ────────────────────────────────────────────────────────────────
docker compose up backend -d >nul 2>&1
if %errorlevel% neq 0 (
    call :msgbox "Backend container failed to start.^n^nCheck Docker Desktop for details."
    goto :cleanup_docker_only
)

:: ── frontend dev server (hidden — no terminal window) ──────────────────────
set "PIDFILE=%TEMP%\nexusgraph_vite.pid"
set "FRONTEND=%ROOT%\frontend"
powershell -NoProfile -Command "& { $p = Start-Process 'cmd.exe' -ArgumentList '/c npm run dev' -WorkingDirectory $env:FRONTEND -WindowStyle Hidden -PassThru; $p.Id | Set-Content -Path $env:PIDFILE -Encoding ASCII }"

:: Wait for Vite to be ready
timeout /t 5 /nobreak >nul

:: ── compile Electron TypeScript ────────────────────────────────────────────
set "TSCLOG=%TEMP%\nexusgraph_tsc.log"
call "frontend\node_modules\.bin\tsc" -p tsconfig.electron.json > "%TSCLOG%" 2>&1
if %errorlevel% neq 0 (
    call :msgbox "TypeScript compile failed.^n^nLog: %TSCLOG%"
    goto :cleanup
)

:: ── launch Electron (blocks until window is closed) ───────────────────────
call "frontend\node_modules\.bin\electron" app\dist\main.js

:: ── cleanup ────────────────────────────────────────────────────────────────
:cleanup
if exist "%PIDFILE%" (
    set /p VITE_PID=<"%PIDFILE%"
    if defined VITE_PID (
        taskkill /pid !VITE_PID! /f /t >nul 2>&1
    )
    del "%PIDFILE%" >nul 2>&1
)

:cleanup_docker_only
docker compose down >nul 2>&1
goto :eof

:: ── subroutine: show a MessageBox error dialog ─────────────────────────────
:msgbox
set "MSGBOX_TEXT=%~1"
powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.MessageBox]::Show($env:MSGBOX_TEXT, 'NexusGraph', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)"
goto :eof