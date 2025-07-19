# Zell0 Server - Windows Firewall Configuration Script
# This script configures Windows Firewall to allow the Zell0 server to communicate

param(
    [string]$Port = "3000",
    [string]$IP = "172.94.3.216",
    [switch]$Remove = $false
)

Write-Host "🔥 Zell0 Server Firewall Configuration" -ForegroundColor Green
Write-Host "Port: $Port" -ForegroundColor Cyan
Write-Host "IP: $IP" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Yellow

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script requires administrator privileges" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again" -ForegroundColor Yellow
    exit 1
}

if ($Remove) {
    Write-Host "🗑️ Removing Zell0 server firewall rules..." -ForegroundColor Yellow
    
    try {
        # Remove existing rules
        Remove-NetFirewallRule -DisplayName "Zell0 Server - Inbound" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "Zell0 Server - Outbound" -ErrorAction SilentlyContinue
        
        Write-Host "✅ Firewall rules removed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to remove firewall rules: $_" -ForegroundColor Red
    }
    
    exit 0
}

Write-Host "🔧 Configuring Windows Firewall..." -ForegroundColor Blue

try {
    # Remove any existing rules first
    Remove-NetFirewallRule -DisplayName "Zell0 Server - Inbound" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "Zell0 Server - Outbound" -ErrorAction SilentlyContinue
    
    # Create inbound rule for the server port
    New-NetFirewallRule -DisplayName "Zell0 Server - Inbound" `
                       -Direction Inbound `
                       -Protocol TCP `
                       -LocalPort $Port `
                       -Action Allow `
                       -Profile Domain,Private,Public `
                       -Description "Allow inbound connections to Zell0 walkie-talkie server on port $Port"
    
    Write-Host "✅ Inbound rule created for port $Port" -ForegroundColor Green
    
    # Create outbound rule for the server port
    New-NetFirewallRule -DisplayName "Zell0 Server - Outbound" `
                       -Direction Outbound `
                       -Protocol TCP `
                       -LocalPort $Port `
                       -Action Allow `
                       -Profile Domain,Private,Public `
                       -Description "Allow outbound connections from Zell0 walkie-talkie server on port $Port"
    
    Write-Host "✅ Outbound rule created for port $Port" -ForegroundColor Green
    
    # Check if Windows Defender Firewall is enabled
    $firewallStatus = Get-NetFirewallProfile | Select-Object Name, Enabled
    Write-Host "🔍 Firewall Status:" -ForegroundColor Blue
    foreach ($profile in $firewallStatus) {
        $status = if ($profile.Enabled) { "Enabled" } else { "Disabled" }
        $color = if ($profile.Enabled) { "Green" } else { "Yellow" }
        Write-Host "  $($profile.Name): $status" -ForegroundColor $color
    }
    
    # Test if port is listening
    Write-Host "🧪 Testing port accessibility..." -ForegroundColor Blue
    
    $listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listening) {
        Write-Host "✅ Port $Port is currently in use" -ForegroundColor Green
        Write-Host "  Process: $($listening.OwningProcess)" -ForegroundColor Gray
    } else {
        Write-Host "ℹ️ Port $Port is available" -ForegroundColor Cyan
    }
    
    # Additional network configuration
    Write-Host "🌐 Network interface configuration..." -ForegroundColor Blue
    
    # Get network adapters and their IP addresses
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
    foreach ($adapter in $adapters) {
        $ipConfig = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
        if ($ipConfig) {
            Write-Host "  Interface: $($adapter.Name)" -ForegroundColor Gray
            Write-Host "    IP: $($ipConfig.IPAddress)" -ForegroundColor Gray
            
            # Check if this is our target IP
            if ($ipConfig.IPAddress -eq $IP) {
                Write-Host "    ✅ Target IP found on this interface!" -ForegroundColor Green
            }
        }
    }
    
    # Create a test to verify firewall configuration
    Write-Host "🔬 Creating firewall test..." -ForegroundColor Blue
    
    $testScript = @"
# Test script to verify Zell0 server connectivity
try {
    `$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('$IP'), $Port)
    `$listener.Start()
    Write-Host "✅ Successfully bound to $IP`:$Port" -ForegroundColor Green
    `$listener.Stop()
} catch {
    Write-Host "❌ Failed to bind to $IP`:$Port" -ForegroundColor Red
    Write-Host "Error: `$_" -ForegroundColor Yellow
}
"@
    
    $testScript | Out-File -FilePath "test-zell0-connectivity.ps1" -Encoding UTF8
    Write-Host "📄 Created test script: test-zell0-connectivity.ps1" -ForegroundColor Cyan
    
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "🎉 Firewall configuration completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Summary:" -ForegroundColor Yellow
    Write-Host "  ✅ Inbound rule created for port $Port" -ForegroundColor White
    Write-Host "  ✅ Outbound rule created for port $Port" -ForegroundColor White
    Write-Host "  📄 Test script created: test-zell0-connectivity.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 To test the configuration:" -ForegroundColor Yellow
    Write-Host "  .\test-zell0-connectivity.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "🗑️ To remove firewall rules:" -ForegroundColor Yellow
    Write-Host "  .\setup-firewall.ps1 -Remove" -ForegroundColor White
    Write-Host "=============================================" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Failed to configure firewall: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Make sure you're running as Administrator" -ForegroundColor White
    Write-Host "  2. Check if Windows Firewall service is running" -ForegroundColor White
    Write-Host "  3. Try manually adding the rule through Windows Security" -ForegroundColor White
    exit 1
} 