@echo off
cd /d "%~dp0\.."
echo === NexusGraph Install ===

echo.
echo Installing all dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 ( echo ERROR: npm install failed & exit /b 1 )
cd ..

echo.
echo Done. Run sysops\run-desktop.bat to launch the desktop app.
echo To remove dependencies and build artifacts, run sysops\uninstall.bat.
