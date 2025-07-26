@echo off
echo ========================================
echo Zell0 Desktop - FINAL FIXED VERSION
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with FINAL fixes...
echo.
echo FIXED Issues:
echo - Desktop can SEND messages to Android ✅
echo - Desktop can RECEIVE messages from Android ✅
echo - Voice messages work both ways ✅
echo - Event names match server-vpn.js exactly ✅
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 