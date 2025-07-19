# Zell0 Server - Deployment Package Creator
# This script creates a deployment package for moving the server to another PC

param(
    [string]$OutputPath = ".\zell0-server-deployment"
)

Write-Host "📦 Creating Zell0 Server Deployment Package" -ForegroundColor Green
Write-Host "Output: $OutputPath" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Yellow

# Create deployment directory
if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# Essential files to copy
$essentialFiles = @(
    "server-vpn.js",
    "package.json", 
    "START-VPN-SERVER.bat",
    "user_profiles.json",
    "setup-firewall.ps1",
    "install-and-setup.ps1",
    "TEST-VPN-IP.bat"
)

Write-Host "📋 Copying essential files..." -ForegroundColor Blue
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $OutputPath -Force
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $file (not found)" -ForegroundColor Yellow
    }
}

# Copy uploads directory if it exists
if (Test-Path "uploads") {
    Copy-Item "uploads" -Destination $OutputPath -Recurse -Force
    Write-Host "  ✅ uploads/ directory" -ForegroundColor Green
} else {
    # Create empty uploads directory
    New-Item -ItemType Directory -Path "$OutputPath\uploads" -Force | Out-Null
    Write-Host "  ℹ️  Created empty uploads/ directory" -ForegroundColor Cyan
}

# Create deployment instructions
$instructions = @"
# Zell0 Server Deployment Instructions

## Requirements
- Windows PC with VPN connection to IP: 172.94.3.216
- Node.js installed (version 14 or higher)
- Administrator privileges for firewall configuration

## Quick Setup Steps

1. **Install Node.js** (if not already installed):
   - Download from: https://nodejs.org/
   - Or run: ``install-and-setup.ps1`` as Administrator

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Configure Firewall** (as Administrator):
   ```
   .\setup-firewall.ps1 -Port 3001
   ```

4. **Start Server**:
   ```
   START-VPN-SERVER.bat
   ```

## Files Included
- server-vpn.js - Main server application
- package.json - Node.js dependencies
- START-VPN-SERVER.bat - Server startup script
- user_profiles.json - User accounts (preserves existing users)
- uploads/ - Shared files directory
- setup-firewall.ps1 - Firewall configuration script
- install-and-setup.ps1 - Complete setup script
- TEST-VPN-IP.bat - VPN connectivity test

## Important Notes
- Server is configured for VPN IP: 172.94.3.216:3001
- No configuration changes needed if using same VPN IP
- Android app is already configured for this IP
- Firewall must allow port 3001 for external connections

## Troubleshooting
1. Verify VPN connection: `ipconfig`
2. Test server: `TEST-VPN-IP.bat`
3. Check firewall: Windows Security > Firewall & network protection
4. Verify Node.js: `node --version`

Generated on: $(Get-Date)
"@

$instructions | Out-File -FilePath "$OutputPath\DEPLOYMENT-INSTRUCTIONS.md" -Encoding UTF8
Write-Host "  ✅ DEPLOYMENT-INSTRUCTIONS.md" -ForegroundColor Green

# Create quick setup script for new PC
$quickSetup = @"
@echo off
title Zell0 Server - Quick Setup
echo.
echo ====================================
echo    Zell0 Server Quick Setup
echo ====================================
echo.
echo 1. Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Make sure Node.js is installed
    pause
    exit /b 1
)

echo.
echo 2. Dependencies installed successfully!
echo.
echo 3. Next steps:
echo    - Run setup-firewall.ps1 as Administrator
echo    - Start server with START-VPN-SERVER.bat
echo.
pause
"@

$quickSetup | Out-File -FilePath "$OutputPath\QUICK-SETUP.bat" -Encoding ASCII
Write-Host "  ✅ QUICK-SETUP.bat" -ForegroundColor Green

# Create zip file
Write-Host "🗜️  Creating zip archive..." -ForegroundColor Blue
$zipPath = "$OutputPath.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

try {
    Compress-Archive -Path "$OutputPath\*" -DestinationPath $zipPath -Force
    Write-Host "✅ Created: $zipPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Failed to create zip: $_" -ForegroundColor Yellow
}

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🎉 Deployment package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Package location: $OutputPath" -ForegroundColor Cyan
Write-Host "📦 Zip file: $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy package to new PC" -ForegroundColor White
Write-Host "  2. Run QUICK-SETUP.bat" -ForegroundColor White
Write-Host "  3. Configure firewall (as Administrator)" -ForegroundColor White
Write-Host "  4. Start server with START-VPN-SERVER.bat" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Yellow 