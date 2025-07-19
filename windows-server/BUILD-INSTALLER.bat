@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================
echo   Zell0 Server Installer Builder
echo ================================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available on this system.
    echo Please install PowerShell 5.0 or later.
    pause
    exit /b 1
)

REM Check if we're running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: This script is not running as Administrator.
    echo Some features may not work correctly.
    echo.
    echo To run as Administrator:
    echo 1. Right-click on this batch file
    echo 2. Select "Run as administrator"
    echo.
    set /p "continue=Continue anyway? (y/n): "
    if /i "!continue!" neq "y" (
        echo Operation cancelled.
        pause
        exit /b 1
    )
)

echo Building Zell0 Server Installer...
echo.

REM Run the PowerShell build script
powershell -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1"

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo   Build completed successfully!
    echo ================================================
    echo.
    echo Check the 'dist' folder for the installer files.
    echo.
) else (
    echo.
    echo ================================================
    echo   Build failed!
    echo ================================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause 