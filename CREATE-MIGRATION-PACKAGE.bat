@echo off
title Zell0 Migration Package Creator
color 0B
echo.
echo =============================================
echo    Zell0 Migration Package Creator
echo =============================================
echo.
echo This will create a complete migration package
echo for moving the Zell0 project to a new PC.
echo.
echo The package will include:
echo - Android App (Kotlin/Android Studio)
echo - Windows Server (Node.js/Electron)
echo - Desktop App (Electron)
echo - Simple Server (Socket.IO)
echo - Setup Scripts
echo - Complete Documentation
echo.
echo VPN Configuration: 172.94.3.216:3001
echo.

pause

echo.
echo 🚀 Creating migration package...
echo.

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "create-migration-package.ps1"

echo.
echo ✅ Migration package creation complete!
echo.
echo 📦 The package is ready for transfer to your new PC.
echo.
pause 