@echo off
echo ========================================
echo Zell0 Desktop - Fixed Messaging
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with fixed messaging...
echo.
echo Fixed Issues:
echo - Message sending format corrected
echo - User list display fixed
echo - Message confirmation handling
echo - Proper sent/received message display
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 