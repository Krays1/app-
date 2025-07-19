@echo off
echo ========================================
echo    Zell0 Username System Migration
echo ========================================
echo.
echo This script will migrate your system from device ID-based
echo to username-based user identification.
echo.
echo This will:
echo - Convert user profiles to use usernames as primary keys
echo - Identify chess games that need to be recreated
echo - Create backups of all existing data
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Starting migration...
node migrate-to-username-system.js

echo.
echo Migration completed!
echo.
echo Next steps:
echo 1. Restart the server using START-VPN-SERVER.bat
echo 2. Users should reconnect with their usernames
echo 3. Chess games will be recreated with proper usernames
echo.
pause 