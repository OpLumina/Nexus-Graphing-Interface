@echo off
cd /d "%~dp0\.."
echo === NexusGraph Install ===

echo.
echo Installing all dependencies...
cd frontend
rem npm ci installs exactly what's in package-lock.json (reproducible, no silent
rem version drift) and fails fast if package.json and the lockfile disagree (ENV-5).
call npm ci
if %errorlevel% neq 0 ( echo ERROR: npm ci failed & exit /b 1 )
cd ..

echo.
echo Done. Run sysops\run-desktop.bat to launch the desktop app.
echo To remove dependencies and build artifacts, run sysops\uninstall.bat.
