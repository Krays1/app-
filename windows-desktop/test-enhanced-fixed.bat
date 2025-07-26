@echo off
echo ========================================
echo Enhanced Desktop App - Fixed Version Test
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting enhanced desktop app with FIXES...
echo.
echo FIXED Issues:
echo - Event listener names corrected ✅
echo - Voice message handling improved ✅
echo - Text message handling improved ✅
echo - Android audio playback enhanced ✅
echo - Better error handling added ✅
echo - Alternative playback methods ✅
echo.

echo Starting enhanced desktop app...
npx electron enhanced-desktop.js

echo.
echo Enhanced desktop app closed.
pause 