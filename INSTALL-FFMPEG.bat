@echo off
echo 🎬 Zell0 FFmpeg Installer
echo ================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if errorlevel 1 (
    echo ❌ PowerShell is not available or not working
    pause
    exit /b 1
)

echo ✅ PowerShell found, installing FFmpeg...
echo.

REM Run the FFmpeg installer script
powershell -ExecutionPolicy Bypass -File "install-ffmpeg.ps1"

echo.
echo 🎉 FFmpeg installation complete!
echo.
pause 