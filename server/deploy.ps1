# Zell0 Server Deployment Script (PowerShell)
# This script helps deploy the Zell0 walkie-talkie server to your VPN server

param(
    [string]$ServerIP = "172.94.3.216",
    [string]$Username = "",
    [string]$KeyFile = ""
)

Write-Host "🚀 Zell0 Server Deployment Script (PowerShell)" -ForegroundColor Green
Write-Host "Target Server: $ServerIP" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Yellow

# Check if required parameters are provided
if (-not $Username) {
    $Username = Read-Host "Enter SSH username for $ServerIP"
}

# Check if SCP is available
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SCP not found. Please install OpenSSH client or use WSL." -ForegroundColor Red
    Write-Host "Alternative: Use WinSCP or manually copy files." -ForegroundColor Yellow
    exit 1
}

# Check if server files exist
$ServerFiles = @("server.js", "package.json", "deploy.sh")
foreach ($file in $ServerFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Missing file: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All server files found" -ForegroundColor Green

# Copy files to server
Write-Host "📋 Copying files to server..." -ForegroundColor Blue

try {
    # Create remote directory and copy files
    $ScpCommand = if ($KeyFile) {
        "scp -i `"$KeyFile`" server.js package.json deploy.sh $Username@$ServerIP`:~/"
    } else {
        "scp server.js package.json deploy.sh $Username@$ServerIP`:~/"
    }
    
    Write-Host "Executing: $ScpCommand" -ForegroundColor Gray
    Invoke-Expression $ScpCommand
    
    Write-Host "✅ Files copied successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

# Connect to server and run deployment
Write-Host "🔧 Connecting to server to run deployment..." -ForegroundColor Blue

$SshCommand = if ($KeyFile) {
    "ssh -i `"$KeyFile`" $Username@$ServerIP"
} else {
    "ssh $Username@$ServerIP"
}

$RemoteCommands = @"
chmod +x deploy.sh
./deploy.sh
"@

try {
    Write-Host "Executing remote commands..." -ForegroundColor Gray
    $SshCommand += " '$RemoteCommands'"
    Invoke-Expression $SshCommand
    
    Write-Host "✅ Deployment completed!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to run remote deployment: $_" -ForegroundColor Red
    Write-Host "You can manually SSH to the server and run: ./deploy.sh" -ForegroundColor Yellow
}

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host "Server should be running at: http://$ServerIP:3000" -ForegroundColor Cyan
Write-Host "Health check: http://$ServerIP:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test the server:" -ForegroundColor Yellow
Write-Host "  curl http://$ServerIP:3000/health" -ForegroundColor White
Write-Host ""
Write-Host "To manage the server (SSH to $ServerIP):" -ForegroundColor Yellow
Write-Host "  sudo systemctl start zell0-server" -ForegroundColor White
Write-Host "  sudo systemctl stop zell0-server" -ForegroundColor White
Write-Host "  sudo systemctl status zell0-server" -ForegroundColor White
Write-Host "  sudo journalctl -u zell0-server -f" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Yellow 