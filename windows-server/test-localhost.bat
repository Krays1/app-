@echo off
echo Testing Zell0 Server on localhost...
echo.
timeout 3
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health'; Write-Host '🎉 SUCCESS: Server is running!' -ForegroundColor Green; Write-Host 'Status:' $r.status -ForegroundColor Yellow; Write-Host 'Uptime:' $r.uptime 'seconds' -ForegroundColor Cyan; Write-Host 'URL: http://127.0.0.1:3000' -ForegroundColor White } catch { Write-Host '❌ Server not responding' -ForegroundColor Red; Write-Host 'Error:' $_.Exception.Message -ForegroundColor Yellow }"
echo.
pause 