@echo off
echo ========================================
echo Zell0 Desktop - Simple Version
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting simple desktop app...
echo.
echo Features:
echo - Direct Socket.IO connection
echo - Simple, clean interface
echo - Dark theme
echo - Real-time messaging
echo - User list updates
echo - DevTools open for debugging
echo.

echo Starting app...
npx electron simple-desktop.js

echo.
echo Desktop app closed.
pause 