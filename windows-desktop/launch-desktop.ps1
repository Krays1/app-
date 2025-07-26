# Zell0 Desktop App Launcher
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Zell0 Desktop App Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "Checking server status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://172.94.3.216:3001" -TimeoutSec 3 -UseBasicParsing
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠ Server may not be running" -ForegroundColor Yellow
    Write-Host "Make sure the Zell0 server is running on 172.94.3.216:3001" -ForegroundColor Yellow
    Write-Host ""
    
    $startServer = Read-Host "Would you like to start the server now? (y/N)"
    if ($startServer -eq "y" -or $startServer -eq "Y") {
        Write-Host "Starting server..." -ForegroundColor Yellow
        Start-Process -FilePath "node" -ArgumentList "server-vpn.js" -WorkingDirectory "..\windows-server" -WindowStyle Normal
        Write-Host "Waiting for server to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

Write-Host ""
Write-Host "Starting Zell0 Desktop App..." -ForegroundColor Yellow
npm start

Write-Host ""
Write-Host "Zell0 Desktop App closed." -ForegroundColor Green 