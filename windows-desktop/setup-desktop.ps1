# Zell0 Desktop App Setup Script
# This script sets up and builds the Windows desktop application

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Zell0 Desktop App Setup Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\setup-desktop.ps1                    # Full setup with tests and build"
    Write-Host "  .\setup-desktop.ps1 -SkipTests         # Skip connection tests"
    Write-Host "  .\setup-desktop.ps1 -SkipBuild         # Skip building executable"
    Write-Host "  .\setup-desktop.ps1 -Help              # Show this help"
    Write-Host ""
    exit 0
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Zell0 Desktop App Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 16+ first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "✗ package.json not found. Please run this script from the windows-desktop directory." -ForegroundColor Red
    exit 1
}

Write-Host "✓ All prerequisites met" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error installing dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test connection to server
if (-not $SkipTests) {
    Write-Host "Testing connection to Zell0 server..." -ForegroundColor Yellow
    
    # Check if server is reachable
    try {
        $response = Invoke-WebRequest -Uri "http://172.94.3.216:3001" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✓ Server is reachable" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Server may not be running or reachable" -ForegroundColor Yellow
        Write-Host "Make sure the Zell0 server is running on 172.94.3.216:3001" -ForegroundColor Yellow
        Write-Host "You can continue with the build, but the app won't connect until the server is running." -ForegroundColor Yellow
        Write-Host ""
        
        $continue = Read-Host "Continue with build? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "Setup cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Run connection test
    try {
        Write-Host "Running connection test..." -ForegroundColor Yellow
        node test-connection.js
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Connection test passed" -ForegroundColor Green
        } else {
            Write-Host "⚠ Connection test failed - server may not be running" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Connection test failed: $_" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Build the application
if (-not $SkipBuild) {
    Write-Host "Building Windows executable..." -ForegroundColor Yellow
    try {
        npm run build-win
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Build completed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Build failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "✗ Error during build: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # Check for output files
    Write-Host "Checking build output..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        $installerFiles = Get-ChildItem "dist" -Filter "*.exe"
        if ($installerFiles.Count -gt 0) {
            Write-Host "✓ Installer created successfully" -ForegroundColor Green
            Write-Host "Installer location: dist\$($installerFiles[0].Name)" -ForegroundColor Cyan
            Write-Host "Size: $([math]::Round($installerFiles[0].Length / 1MB, 2)) MB" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ Build completed but no installer found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ dist folder not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipBuild) {
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Run the installer from the dist folder" -ForegroundColor Cyan
    Write-Host "2. Launch Zell0 Desktop from Start Menu" -ForegroundColor Cyan
    Write-Host "3. Configure your username in Settings" -ForegroundColor Cyan
    Write-Host "4. Connect to the server and start chatting!" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 