@echo off
echo ========================================
echo Zell0 Desktop App - Quick Fix
echo ========================================
echo.

echo Stopping any running desktop apps...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting desktop app with fixes...
echo.
echo Fixed Issues:
echo - Message display in UI
echo - Connection status updates
echo - User list updates
echo - Message sending
echo.

npm start

echo.
echo Desktop app closed.
pause 