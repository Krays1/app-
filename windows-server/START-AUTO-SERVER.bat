@echo off
title Zell0 Server - Auto IP Detection
color 0A
echo.
echo ========================================
echo    Zell0 Server - Auto IP Detection
echo ========================================
echo.
echo Starting server with automatic IP detection...
echo This will show all available network interfaces
echo and automatically select the best IP address.
echo.
node server-auto-ip.js
echo.
echo Server stopped.
pause 