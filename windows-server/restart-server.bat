@echo off
echo Stopping Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Clearing old chess games...
del X:\chess_games.json 2>nul

echo Starting server...
node server-vpn.js 