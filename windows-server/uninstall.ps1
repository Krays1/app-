# Zell0 Server Uninstaller
# This script removes all traces of the Zell0 Server application

Write-Host "Uninstalling Zell0 Server..." -ForegroundColor Yellow

# Stop the service/process if running
Write-Host "Stopping Zell0 Server processes..." -ForegroundColor Cyan
try {
    # Stop Electron app processes
    $processes = Get-Process -Name "Zell0Server" -ErrorAction SilentlyContinue
    if ($processes) {
        $processes | ForEach-Object { 
            Write-Host "Stopping process: $($_.Name) (PID: $($_.Id))" -ForegroundColor Gray
            $_.CloseMainWindow()
            Start-Sleep -Seconds 2
            if (!$_.HasExited) {
                $_.Kill()
            }
        }
    }
    
    # Stop Node.js processes running on port 3000
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*Zell0*" -or 
        (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $_.Id })
    }
    
    if ($nodeProcesses) {
        $nodeProcesses | ForEach-Object {
            Write-Host "Stopping Node.js process: PID $($_.Id)" -ForegroundColor Gray
            $_.CloseMainWindow()
            Start-Sleep -Seconds 2
            if (!$_.HasExited) {
                $_.Kill()
            }
        }
    }
} catch {
    Write-Host "Error stopping processes: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove from startup programs
Write-Host "Removing from startup programs..." -ForegroundColor Cyan
try {
    # Remove from registry startup
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    )
    
    foreach ($path in $registryPaths) {
        if (Get-ItemProperty -Path $path -Name "Zell0Server" -ErrorAction SilentlyContinue) {
            Remove-ItemProperty -Path $path -Name "Zell0Server" -Force
            Write-Host "Removed from $path" -ForegroundColor Gray
        }
    }
    
    # Remove from Task Scheduler
    $taskName = "Zell0Server"
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "Removed scheduled task: $taskName" -ForegroundColor Gray
    }
    
    # Remove from startup folder
    $startupPath = [Environment]::GetFolderPath("Startup")
    $shortcutPath = Join-Path $startupPath "Zell0Server.lnk"
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "Removed startup shortcut" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Error removing startup entries: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove Windows Firewall rules
Write-Host "Removing Windows Firewall rules..." -ForegroundColor Cyan
try {
    $firewallRules = @("Zell0Server-In", "Zell0Server-Out")
    foreach ($ruleName in $firewallRules) {
        if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
            Remove-NetFirewallRule -DisplayName $ruleName
            Write-Host "Removed firewall rule: $ruleName" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error removing firewall rules: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove desktop shortcuts
Write-Host "Removing desktop shortcuts..." -ForegroundColor Cyan
try {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcuts = @(
        (Join-Path $desktopPath "Zell0Server.lnk"),
        (Join-Path $desktopPath "Zell0 Server.lnk")
    )
    
    foreach ($shortcut in $shortcuts) {
        if (Test-Path $shortcut) {
            Remove-Item $shortcut -Force
            Write-Host "Removed desktop shortcut: $(Split-Path $shortcut -Leaf)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error removing desktop shortcuts: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove Start Menu shortcuts
Write-Host "Removing Start Menu shortcuts..." -ForegroundColor Cyan
try {
    $startMenuPath = [Environment]::GetFolderPath("Programs")
    $programsPath = Join-Path $startMenuPath "Zell0 Server"
    
    if (Test-Path $programsPath) {
        Remove-Item $programsPath -Recurse -Force
        Write-Host "Removed Start Menu folder: $programsPath" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error removing Start Menu shortcuts: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove application data
Write-Host "Removing application data..." -ForegroundColor Cyan
try {
    $appDataPaths = @(
        (Join-Path $env:LOCALAPPDATA "Zell0Server"),
        (Join-Path $env:APPDATA "Zell0Server"),
        (Join-Path $env:USERPROFILE "AppData\Roaming\zell0-server")
    )
    
    foreach ($path in $appDataPaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force
            Write-Host "Removed application data: $path" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error removing application data: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove logs and temporary files
Write-Host "Removing logs and temporary files..." -ForegroundColor Cyan
try {
    $logPaths = @(
        (Join-Path $env:TEMP "zell0-server*"),
        (Join-Path $env:USERPROFILE "Documents\Zell0Server")
    )
    
    foreach ($path in $logPaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force
            Write-Host "Removed logs: $path" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error removing logs: $($_.Exception.Message)" -ForegroundColor Red
}

# Remove registry entries
Write-Host "Removing registry entries..." -ForegroundColor Cyan
try {
    $registryPaths = @(
        "HKCU:\Software\Zell0Server",
        "HKLM:\Software\Zell0Server"
    )
    
    foreach ($path in $registryPaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force
            Write-Host "Removed registry key: $path" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error removing registry entries: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Zell0 Server has been successfully uninstalled!" -ForegroundColor Green
Write-Host "Thank you for using Zell0 Server." -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: The installation directory will be removed by the Windows Installer." -ForegroundColor Gray

# Pause to let user see the results
Read-Host "Press Enter to close this window" 