# Zell0 Desktop App Builder
# This script builds the Windows desktop executable

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Zell0 Desktop App for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please install npm." -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "✗ package.json not found. Please run this script from the windows-desktop directory." -ForegroundColor Red
    exit 1
}

Write-Host ""
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
Write-Host "Checking for output files..." -ForegroundColor Yellow
if (Test-Path "dist") {
    $installerFiles = Get-ChildItem "dist" -Filter "*.exe"
    if ($installerFiles.Count -gt 0) {
        Write-Host "✓ Installer created successfully" -ForegroundColor Green
        Write-Host "Installer location: dist\$($installerFiles[0].Name)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Build completed but no installer found" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ dist folder not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Build process completed!" -ForegroundColor Green
Write-Host "Check the 'dist' folder for the installer." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 