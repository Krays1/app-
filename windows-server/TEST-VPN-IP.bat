@echo off
title Test VPN IP Binding (172.94.3.216)
color 0E
echo.
echo =============================================
echo    Test VPN IP Binding
echo    IP: 172.94.3.216:3000
echo =============================================
echo.
echo This will test if your system can bind to
echo the VPN IP address 172.94.3.216
echo.
echo If this test fails, you may need to:
echo   - Connect to VPN
echo   - Configure network adapter
echo   - Run as Administrator
echo.
echo Starting test...
echo.

node test-vpn-server.js

echo.
pause 