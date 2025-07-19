@echo off
title Zell0 Walkie-Talkie Server (VPN: 172.94.3.216)
color 0A
echo.
echo =============================================
echo    Zell0 Walkie-Talkie Server
echo    VPN IP: 172.94.3.216:3001
echo =============================================
echo.
echo Starting server on VPN IP address...
echo This server is configured for:
echo   - Audio messaging (Push-to-talk)
echo   - Text messaging
echo   - Multiple Android devices
echo.
echo Your Android app is already configured to use:
echo   http://172.94.3.216:3001
echo.
echo Starting server...
echo.

cd /d "%~dp0"
node server-vpn.js

echo.
echo Server stopped.
echo.
pause 