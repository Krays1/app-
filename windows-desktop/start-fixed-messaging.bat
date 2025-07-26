@echo off
echo ========================================
echo Zell0 Desktop - Fixed Messaging
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with FIXED messaging...
echo.
echo FIXED Issues:
echo - Message sending event names corrected
echo - Voice message sending event names corrected
echo - Message receiving event names corrected
echo - Now matches Android app event names
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 