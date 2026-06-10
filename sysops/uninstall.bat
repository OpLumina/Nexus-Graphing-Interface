@echo off
cd /d "%~dp0\.."
echo === NexusGraph Uninstall ===

echo.
echo Removing frontend dependencies...
if exist frontend\node_modules (
    rmdir /s /q frontend\node_modules
    echo Removed frontend\node_modules
) else (
    echo frontend\node_modules not found, skipping
)

echo.
echo Removing build artifacts...
if exist frontend\dist (
    rmdir /s /q frontend\dist
    echo Removed frontend\dist
)
if exist app\dist (
    rmdir /s /q app\dist
    echo Removed app\dist
)

echo.
echo Done. Run sysops\install.bat to reinstall.
