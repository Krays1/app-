@echo off
echo ========================================
echo Zell0 Desktop - AUDIO FIXED VERSION
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with AUDIO FIXES...
echo.
echo FIXED Issues:
echo - "Failed to start recording" error ✅
echo - Static noise during recording ✅
echo - No audio playback from Android ✅
echo - Audio format incompatibility ✅
echo - PCM 16-bit restrictions removed ✅
echo - Flexible audio format system ✅
echo - Multiple format fallbacks ✅
echo - Better error handling ✅
echo.

echo Starting enhanced desktop app...
npx electron enhanced-desktop.js

echo.
echo Desktop app closed.
pause 