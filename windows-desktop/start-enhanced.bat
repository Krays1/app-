@echo off
echo ========================================
echo Zell0 Desktop - Enhanced Version
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting enhanced desktop app...
echo.
echo Enhanced Features:
echo - Audio device selection (microphone/speakers)
echo - Volume controls for input and output
echo - Audio quality settings (sample rate, channels)
echo - Audio processing options (echo cancellation, noise suppression)
echo - Improved user list with device information
echo - Better connection status display
echo - Audio testing functionality
echo.

echo Starting app...
npx electron enhanced-desktop.js

echo.
echo Enhanced desktop app closed.
pause 