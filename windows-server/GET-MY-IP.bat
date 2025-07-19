@echo off
title Get IP Address for Android App
color 0B
echo.
echo ==========================================
echo    Get IP Address for Android App
echo ==========================================
echo.
echo Finding your network IP address...
echo.

node show-ip.js

echo.
echo ==========================================
echo   NEXT STEPS:
echo ==========================================
echo.
echo 1. Copy the RECOMMENDED IP address above
echo 2. Open: app\src\main\java\com\example\zell0\NetworkManager.kt
echo 3. Find line: private const val SERVER_URL = "..."
echo 4. Replace with your IP: "http://YOUR_IP:3000"
echo 5. Rebuild your Android app
echo.
echo Example:
echo   private const val SERVER_URL = "http://192.168.1.100:3000"
echo.
pause 