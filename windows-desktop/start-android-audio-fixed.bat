@echo off
echo ========================================
echo Zell0 Desktop - ANDROID AUDIO FIXED
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with ANDROID AUDIO FIXES...
echo.
echo FIXED Issues:
echo - "Failed to play audio in any supported format" ✅
echo - Android PCM 16-bit audio playback ✅
echo - Desktop to Android audio conversion ✅
echo - WAV header creation for PCM audio ✅
echo - Bidirectional audio compatibility ✅
echo - Audio format mismatch resolved ✅
echo - Base64 encoding/decoding fixed ✅
echo.

echo Starting enhanced desktop app...
npx electron enhanced-desktop.js

echo.
echo Desktop app closed.
pause 