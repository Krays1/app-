@echo off
echo ========================================
echo Zell0 Desktop - AUDIO STABLE VERSION
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with STABLE AUDIO FIXES...
echo.
echo FIXED Issues:
echo - DevTools disconnection prevention ✅
echo - Global error handlers added ✅
echo - Audio context timeout protection ✅
echo - Fallback audio conversion methods ✅
echo - Better error handling and logging ✅
echo - Audio format compatibility improved ✅
echo - Android PCM 16-bit support ✅
echo.

echo Starting enhanced desktop app...
npx electron enhanced-desktop.js

echo.
echo Desktop app closed.
pause 