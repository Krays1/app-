@echo off
echo ========================================
echo Zell0 Desktop - COMPLETE FIXED VERSION
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with COMPLETE fixes...
echo.
echo FIXED Features:
echo - Desktop can SEND messages to Android ✅
echo - Desktop can RECEIVE messages from Android ✅
echo - Desktop shows YOUR OWN messages (like Android) ✅
echo - Voice recording and sending works ✅
echo - Voice playback works ✅
echo - Real-time bidirectional communication ✅
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 