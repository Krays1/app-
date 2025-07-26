@echo off
echo ========================================
echo Zell0 Complete System Launcher
echo ========================================
echo.

echo Starting Zell0 Server...
cd ..\windows-server
start "Zell0 Server" cmd /k "node server-vpn.js"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Starting Zell0 Desktop App...
cd ..\windows-desktop
npm start

echo.
echo Zell0 Desktop App closed.
pause 