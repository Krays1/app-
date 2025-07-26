@echo off
echo ========================================
echo Building Zell0 Desktop App for Windows
echo ========================================

echo.
echo Installing dependencies...
call npm install

echo.
echo Building executable...
call npm run build-win

echo.
echo Build complete! Check the dist folder for the installer.
echo.
pause 