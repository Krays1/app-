@echo off
echo ========================================
echo Zell0 Desktop App - Complete Fix
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Starting desktop app with complete fixes...
echo.
echo Fixed Issues:
echo - IPC event forwarding from main to renderer
echo - Message display in UI
echo - Connection status updates
echo - User list updates
echo - Message sending
echo - Debug logging added
echo.

echo Starting app...
npm start

echo.
echo Desktop app closed.
pause 