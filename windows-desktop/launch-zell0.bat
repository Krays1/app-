@echo off
echo ========================================
echo Zell0 Desktop App Launcher
echo ========================================
echo.

echo Starting Zell0 Server...
start "Zell0 Server" cmd /k "cd ..\windows-server && node server-vpn.js"

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo Starting Zell0 Desktop App...
npm start

echo.
echo Zell0 Desktop App closed.
pause 