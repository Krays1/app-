@echo off
echo 🎬 Zell0 Video Thumbnail Generator
echo =====================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if errorlevel 1 (
    echo ❌ PowerShell is not available or not working
    pause
    exit /b 1
)

echo ✅ PowerShell found, running thumbnail generator...
echo.

REM Run the PowerShell script with execution policy bypass
powershell -ExecutionPolicy Bypass -File "generate-thumbnails.ps1"

echo.
echo 🎬 Thumbnail generation complete!
echo.
pause 