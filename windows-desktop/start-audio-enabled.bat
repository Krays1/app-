@echo off
echo ========================================
echo Zell0 Desktop - Audio Enabled
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with audio support...
echo.
echo New Features:
echo - Voice message recording (click microphone button)
echo - Voice message playback (click play button on voice messages)
echo - Real-time audio communication with Android app
echo - 16kHz audio quality for compatibility
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 