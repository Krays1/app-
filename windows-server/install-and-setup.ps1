# Zell0 Windows Server - Complete Installation and Setup Script
# This script installs Node.js, sets up the application, configures firewall, and sets up auto-start

param(
    [switch]$SkipNodeJS = $false,
    [switch]$SkipFirewall = $false,
    [switch]$SkipAutoStart = $false,
    [string]$InstallPath = "$env:LOCALAPPDATA\Zell0Server"
)

Write-Host "🚀 Zell0 Windows Server Installation" -ForegroundColor Green
Write-Host "Installation Path: $InstallPath" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Yellow

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️ Not running as Administrator" -ForegroundColor Yellow
    Write-Host "Some features (firewall, auto-start) may require admin privileges" -ForegroundColor Yellow
    
    $choice = Read-Host "Continue anyway? (y/n)"
    if ($choice -ne 'y' -and $choice -ne 'Y') {
        Write-Host "Installation cancelled" -ForegroundColor Red
        exit 1
    }
}

# Step 1: Install Node.js if needed
if (-not $SkipNodeJS) {
    Write-Host "📦 Checking Node.js installation..." -ForegroundColor Blue
    
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✅ Node.js is already installed: $nodeVersion" -ForegroundColor Green
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-Host "📥 Installing Node.js..." -ForegroundColor Blue
        
        # Download Node.js installer
        $nodeUrl = "https://nodejs.org/dist/v20.9.0/node-v20.9.0-x64.msi"
        $nodeInstaller = "$env:TEMP\nodejs-installer.msi"
        
        try {
            Write-Host "Downloading Node.js installer..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
            
            Write-Host "Running Node.js installer..." -ForegroundColor Gray
            Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstaller, "/quiet" -Wait
            
            # Refresh environment variables
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            
            # Verify installation
            $nodeVersion = node --version 2>$null
            if ($nodeVersion) {
                Write-Host "✅ Node.js installed successfully: $nodeVersion" -ForegroundColor Green
            } else {
                throw "Node.js installation verification failed"
            }
            
            # Clean up
            Remove-Item $nodeInstaller -ErrorAction SilentlyContinue
            
        } catch {
            Write-Host "❌ Failed to install Node.js: $_" -ForegroundColor Red
            Write-Host "Please install Node.js manually from https://nodejs.org/" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Step 2: Create installation directory
Write-Host "📁 Creating installation directory..." -ForegroundColor Blue

try {
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        Write-Host "✅ Created directory: $InstallPath" -ForegroundColor Green
    } else {
        Write-Host "✅ Directory already exists: $InstallPath" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create installation directory: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Copy application files
Write-Host "📋 Installing application files..." -ForegroundColor Blue

$filesToCopy = @(
    "package.json",
    "main.js", 
    "index.html"
)

try {
    foreach ($file in $filesToCopy) {
        if (Test-Path $file) {
            Copy-Item $file -Destination $InstallPath -Force
            Write-Host "  ✅ Copied $file" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠️ File not found: $file" -ForegroundColor Yellow
        }
    }
    
    # Copy assets directory if it exists
    if (Test-Path "assets") {
        Copy-Item "assets" -Destination $InstallPath -Recurse -Force
        Write-Host "  ✅ Copied assets directory" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to copy application files: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Install dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Blue

try {
    Push-Location $InstallPath
    
    # Install production dependencies
    npm install --production --silent
    
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

# Step 5: Configure Windows Firewall
if (-not $SkipFirewall -and $isAdmin) {
    Write-Host "🔥 Configuring Windows Firewall..." -ForegroundColor Blue
    
    try {
        # Run firewall configuration
        if (Test-Path "setup-firewall.ps1") {
            & ".\setup-firewall.ps1"
        } else {
            # Inline firewall configuration
            Remove-NetFirewallRule -DisplayName "Zell0 Server - Inbound" -ErrorAction SilentlyContinue
            Remove-NetFirewallRule -DisplayName "Zell0 Server - Outbound" -ErrorAction SilentlyContinue
            
            New-NetFirewallRule -DisplayName "Zell0 Server - Inbound" `
                               -Direction Inbound `
                               -Protocol TCP `
                               -LocalPort 3000 `
                               -Action Allow `
                               -Profile Domain,Private,Public `
                               -Description "Allow inbound connections to Zell0 walkie-talkie server"
            
            New-NetFirewallRule -DisplayName "Zell0 Server - Outbound" `
                               -Direction Outbound `
                               -Protocol TCP `
                               -LocalPort 3000 `
                               -Action Allow `
                               -Profile Domain,Private,Public `
                               -Description "Allow outbound connections from Zell0 walkie-talkie server"
        }
        
        Write-Host "✅ Firewall configured successfully" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Firewall configuration failed: $_" -ForegroundColor Yellow
        Write-Host "You may need to configure firewall manually" -ForegroundColor Yellow
    }
} elseif (-not $SkipFirewall) {
    Write-Host "⚠️ Skipping firewall configuration (requires admin privileges)" -ForegroundColor Yellow
}

# Step 6: Create startup script
Write-Host "📜 Creating startup script..." -ForegroundColor Blue

$startupScript = @"
@echo off
title Zell0 Server
cd /d "$InstallPath"
echo Starting Zell0 Server...
echo Server will run on 172.94.3.216:3000
echo.
node main.js
pause
"@

$startupScriptPath = "$InstallPath\start-zell0-server.bat"
$startupScript | Out-File -FilePath $startupScriptPath -Encoding ASCII

Write-Host "✅ Created startup script: $startupScriptPath" -ForegroundColor Green

# Step 7: Create desktop shortcut
Write-Host "🖥️ Creating desktop shortcut..." -ForegroundColor Blue

try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\Zell0 Server.lnk")
    $shortcut.TargetPath = $startupScriptPath
    $shortcut.WorkingDirectory = $InstallPath
    $shortcut.Description = "Zell0 Walkie-Talkie Server"
    $shortcut.IconLocation = "$InstallPath\assets\icon.ico,0"
    $shortcut.Save()
    
    Write-Host "✅ Desktop shortcut created" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Failed to create desktop shortcut: $_" -ForegroundColor Yellow
}

# Step 8: Setup auto-start
if (-not $SkipAutoStart) {
    Write-Host "🔄 Setting up auto-start..." -ForegroundColor Blue
    
    try {
        # Create a scheduled task to start the server at login
        $taskName = "Zell0 Server Auto-Start"
        
        # Remove existing task if it exists
        schtasks /delete /tn "$taskName" /f 2>$null
        
        # Create new task
        $taskCommand = "node"
        $taskArgs = "`"$InstallPath\main.js`""
        $taskWorkingDir = $InstallPath
        
        if ($isAdmin) {
            # Create system-wide task (runs for all users)
            schtasks /create /tn "$taskName" /tr "$taskCommand $taskArgs" /sc onlogon /ru "SYSTEM" /rl highest /f
        } else {
            # Create user-specific task
            schtasks /create /tn "$taskName" /tr "$taskCommand $taskArgs" /sc onlogon /f
        }
        
        Write-Host "✅ Auto-start configured successfully" -ForegroundColor Green
        
        # Also add to Windows startup folder as backup
        $startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
        $startupLinkPath = "$startupFolder\Zell0 Server.lnk"
        
        $WScriptShell = New-Object -ComObject WScript.Shell
        $startupLink = $WScriptShell.CreateShortcut($startupLinkPath)
        $startupLink.TargetPath = "node"
        $startupLink.Arguments = "`"$InstallPath\main.js`""
        $startupLink.WorkingDirectory = $InstallPath
        $startupLink.WindowStyle = 7  # Minimized
        $startupLink.Description = "Zell0 Server Auto-Start"
        $startupLink.Save()
        
        Write-Host "✅ Added to Windows startup folder" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️ Auto-start setup failed: $_" -ForegroundColor Yellow
        Write-Host "You can manually start the server using the desktop shortcut" -ForegroundColor Yellow
    }
}

# Step 9: Create uninstaller
Write-Host "🗑️ Creating uninstaller..." -ForegroundColor Blue

$uninstallScript = @"
# Zell0 Server Uninstaller
Write-Host "Uninstalling Zell0 Server..." -ForegroundColor Yellow

# Stop any running instances
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { `$_.MainModule.FileName -like "*zell0*" } | Stop-Process -Force

# Remove scheduled task
schtasks /delete /tn "Zell0 Server Auto-Start" /f 2>`$null

# Remove startup shortcut
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Zell0 Server.lnk" -ErrorAction SilentlyContinue

# Remove desktop shortcut
Remove-Item "$env:USERPROFILE\Desktop\Zell0 Server.lnk" -ErrorAction SilentlyContinue

# Remove firewall rules
if (([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Remove-NetFirewallRule -DisplayName "Zell0 Server - Inbound" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "Zell0 Server - Outbound" -ErrorAction SilentlyContinue
    Write-Host "Firewall rules removed" -ForegroundColor Green
}

# Remove installation directory
Remove-Item "$InstallPath" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Zell0 Server uninstalled successfully" -ForegroundColor Green
pause
"@

$uninstallScript | Out-File -FilePath "$InstallPath\uninstall.ps1" -Encoding UTF8

Write-Host "✅ Uninstaller created: $InstallPath\uninstall.ps1" -ForegroundColor Green

# Step 10: Test the installation
Write-Host "🧪 Testing installation..." -ForegroundColor Blue

try {
    Push-Location $InstallPath
    
    # Quick test to see if the app starts
    $testProcess = Start-Process -FilePath "node" -ArgumentList "main.js" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    if (-not $testProcess.HasExited) {
        Write-Host "✅ Server started successfully (test mode)" -ForegroundColor Green
        $testProcess | Stop-Process -Force
    } else {
        Write-Host "⚠️ Server failed to start in test mode" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "⚠️ Installation test failed: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Final summary
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🎉 Zell0 Server Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Installation Summary:" -ForegroundColor Yellow
Write-Host "  📁 Installed to: $InstallPath" -ForegroundColor White
Write-Host "  🌐 Server IP: 172.94.3.216:3000" -ForegroundColor White
Write-Host "  🖥️ Desktop shortcut: Created" -ForegroundColor White
Write-Host "  🔄 Auto-start: $(if (-not $SkipAutoStart) {'Configured'} else {'Skipped'})" -ForegroundColor White
Write-Host "  🔥 Firewall: $(if (-not $SkipFirewall -and $isAdmin) {'Configured'} else {'Skipped or No Admin'})" -ForegroundColor White
Write-Host ""
Write-Host "🚀 How to use:" -ForegroundColor Yellow
Write-Host "  1. Double-click 'Zell0 Server' on desktop to start" -ForegroundColor White
Write-Host "  2. Server will auto-start with Windows" -ForegroundColor White
Write-Host "  3. Build and install Android app" -ForegroundColor White
Write-Host "  4. Test communication between devices" -ForegroundColor White
Write-Host ""
Write-Host "📱 Android App Configuration:" -ForegroundColor Yellow
Write-Host "  Server IP: 172.94.3.216" -ForegroundColor White
Write-Host "  Port: 3000" -ForegroundColor White
Write-Host "  Health Check: http://172.94.3.216:3000/health" -ForegroundColor White
Write-Host ""
Write-Host "🛠️ Management:" -ForegroundColor Yellow
Write-Host "  Uninstall: Run $InstallPath\uninstall.ps1" -ForegroundColor White
Write-Host "  Logs: Check Windows Event Viewer or Task Manager" -ForegroundColor White
Write-Host ""
Write-Host "✅ Installation completed successfully!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Yellow 