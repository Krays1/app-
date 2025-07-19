@echo off
echo Testing Chess Game Debug...
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    npm install socket.io-client
)

echo Running chess debug test...
node test-chess-debug.js

echo.
echo Test completed. Press any key to exit.
pause >nul 