@echo off
title Find Your PC's IP Address for Plex
color 0A
echo.
echo =============================================
echo    Finding Your PC's IP Address
echo    For Plex Server Configuration
echo =============================================
echo.
echo This will show you your PC's IP address on the network.
echo You'll need this to configure the Plex integration in the app.
echo.
echo Press any key to continue...
pause >nul
echo.
echo =============================================
echo    Your PC's IP Addresses:
echo =============================================
echo.

ipconfig | findstr "IPv4"

echo.
echo =============================================
echo    Instructions:
echo =============================================
echo.
echo 1. Look for "IPv4 Address" above
echo 2. It will be something like: 192.168.1.100
echo 3. Use this IP address in the Plex configuration
echo 4. The port is usually: 32400
echo.
echo =============================================
echo    Plex Token (Optional):
echo =============================================
echo.
echo To get your Plex token:
echo 1. Open Plex Media Server on your PC
echo 2. Go to Settings ^> Server ^> General
echo 3. Look for "Plex Token" or "Access Token"
echo.
echo OR:
echo 1. Go to plex.tv/web/app in your browser
echo 2. Press F12 to open developer tools
echo 3. Go to Network tab
echo 4. Refresh the page
echo 5. Look for "X-Plex-Token" in request headers
echo.
echo =============================================
echo.
pause 