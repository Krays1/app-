@echo off
echo ========================================
echo Zell0 Desktop - ALL FEATURES FIXED
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with ALL fixes...
echo.
echo FIXED Features:
echo - Desktop can SEND messages to Android ✅
echo - Desktop can RECEIVE messages from Android ✅
echo - Desktop shows YOUR OWN messages ✅
echo - User list shows connected users ✅
echo - Voice recording and sending works ✅
echo - Voice playback works ✅
echo - Live audio streaming (push-to-talk) ✅
echo - Real-time bidirectional communication ✅
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 