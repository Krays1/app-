# Zell0 Project Migration Package Creator
# This script creates a complete migration package for moving to a new PC

param(
    [string]$OutputPath = "zell0-migration-package",
    [switch]$IncludeNodeModules = $false
)

Write-Host "🚀 Creating Zell0 Migration Package..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Create output directory
$OutputDir = Join-Path (Get-Location) $OutputPath
if (Test-Path $OutputDir) {
    Write-Host "⚠️  Output directory already exists. Removing..." -ForegroundColor Yellow
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

Write-Host "📁 Created output directory: $OutputDir" -ForegroundColor Cyan

# Define files and directories to include
$IncludePaths = @(
    # Android App
    "app",
    "gradle",
    "gradlew",
    "gradlew.bat",
    "build.gradle.kts",
    "gradle.properties",
    "settings.gradle.kts",
    
    # Windows Server
    "windows-server/server-vpn.js",
    "windows-server/package.json",
    "windows-server/START-VPN-SERVER.bat",
    "windows-server/TEST-VPN-IP.bat",
    "windows-server/chess-save-system.js",
    "windows-server/user_profiles.json",
    "windows-server/chess-saves",
    "windows-server/thumbnails",
    "windows-server/uploads",
    "windows-server/assets",
    
    # Windows Desktop
    "windows-desktop/package.json",
    "windows-desktop/simple-desktop.js",
    "windows-desktop/simple-index.html",
    "windows-desktop/simple-renderer.js",
    "windows-desktop/assets",
    
    # Simple Server
    "server/package.json",
    "server/server.js",
    
    # Documentation
    "README.md",
    "VPN-CONFIGURATION-GUIDE.md",
    "MIGRATION-GUIDE.md",
    "DEPENDENCIES-SUMMARY.md",
    "setup-new-pc.bat"
)

# Define files to exclude
$ExcludePatterns = @(
    "*.log",
    "*.tmp",
    "*.cache",
    ".git",
    ".idea",
    "build",
    "dist",
    "node_modules"
)

if (-not $IncludeNodeModules) {
    $ExcludePatterns += "node_modules"
}

Write-Host "📦 Copying project files..." -ForegroundColor Cyan

# Copy files and directories
foreach ($Path in $IncludePaths) {
    $SourcePath = Join-Path (Get-Location) $Path
    $DestPath = Join-Path $OutputDir $Path
    
    if (Test-Path $SourcePath) {
        if (Test-Path $SourcePath -PathType Container) {
            # Copy directory
            Write-Host "  📁 Copying directory: $Path" -ForegroundColor Gray
            Copy-Item -Path $SourcePath -Destination $DestPath -Recurse -Force
        } else {
            # Copy file
            Write-Host "  📄 Copying file: $Path" -ForegroundColor Gray
            $DestDir = Split-Path $DestPath -Parent
            if (-not (Test-Path $DestDir)) {
                New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
            }
            Copy-Item -Path $SourcePath -Destination $DestPath -Force
        }
    } else {
        Write-Host "  ⚠️  Warning: $Path not found" -ForegroundColor Yellow
    }
}

# Remove excluded patterns
Write-Host "🧹 Cleaning up excluded files..." -ForegroundColor Cyan
foreach ($Pattern in $ExcludePatterns) {
    $ExcludePaths = Get-ChildItem -Path $OutputDir -Recurse -Name $Pattern -ErrorAction SilentlyContinue
    foreach ($ExcludePath in $ExcludePaths) {
        $FullPath = Join-Path $OutputDir $ExcludePath
        if (Test-Path $FullPath) {
            Write-Host "  🗑️  Removing: $ExcludePath" -ForegroundColor Gray
            Remove-Item -Path $FullPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Create package info file
$PackageInfo = @"
# Zell0 Migration Package
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source: $(Get-Location)
VPN IP: 172.94.3.216:3001

## Contents
- Android App (Kotlin/Android Studio)
- Windows Server (Node.js/Electron)
- Desktop App (Electron)
- Simple Server (Socket.IO)
- Setup Scripts
- Documentation

## Quick Start
1. Extract this package to your new PC
2. Run setup-new-pc.bat
3. Follow MIGRATION-GUIDE.md for detailed instructions

## Requirements
- Java JDK 17
- Android Studio
- Node.js 18.x or 20.x
- VPN access to 172.94.3.216
"@

$PackageInfo | Out-File -FilePath (Join-Path $OutputDir "PACKAGE-INFO.md") -Encoding UTF8

# Create batch file for easy extraction
$ExtractScript = @"
@echo off
title Zell0 Migration Package Extractor
color 0A
echo.
echo =============================================
echo    Zell0 Migration Package Extractor
echo =============================================
echo.
echo This will extract the Zell0 project to your PC.
echo.
echo Requirements:
echo - Java JDK 17
echo - Android Studio
echo - Node.js
echo - VPN access to 172.94.3.216
echo.
pause

echo.
echo 📦 Extracting files...
echo.

REM Extract to current directory
powershell -Command "Expand-Archive -Path '%~dp0zell0-migration-package.zip' -DestinationPath '.' -Force"

echo.
echo ✅ Extraction complete!
echo.
echo 📋 Next steps:
echo    1. Run setup-new-pc.bat
echo    2. Follow MIGRATION-GUIDE.md
echo    3. Test VPN connectivity
echo.
pause
"@

$ExtractScript | Out-File -FilePath (Join-Path $OutputDir "EXTRACT-AND-SETUP.bat") -Encoding ASCII

# Create ZIP file
$ZipPath = "$OutputPath.zip"
Write-Host "🗜️  Creating ZIP package: $ZipPath" -ForegroundColor Cyan

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

Compress-Archive -Path $OutputDir -DestinationPath $ZipPath -CompressionLevel Optimal

# Calculate package size
$PackageSize = (Get-Item $ZipPath).Length
$PackageSizeMB = [math]::Round($PackageSize / 1MB, 2)

Write-Host "✅ Migration package created successfully!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "📦 Package: $ZipPath" -ForegroundColor Cyan
Write-Host "📊 Size: $PackageSizeMB MB" -ForegroundColor Cyan
Write-Host "📁 Contents: $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Copy $ZipPath to your new PC" -ForegroundColor White
Write-Host "   2. Extract the ZIP file" -ForegroundColor White
Write-Host "   3. Run EXTRACT-AND-SETUP.bat" -ForegroundColor White
Write-Host "   4. Follow MIGRATION-GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation included:" -ForegroundColor Yellow
Write-Host "   - MIGRATION-GUIDE.md (Complete setup guide)" -ForegroundColor White
Write-Host "   - DEPENDENCIES-SUMMARY.md (All requirements)" -ForegroundColor White
Write-Host "   - VPN-CONFIGURATION-GUIDE.md (Network setup)" -ForegroundColor White
Write-Host ""

# Clean up temporary directory
Remove-Item $OutputDir -Recurse -Force

Write-Host "🎉 Migration package ready for transfer!" -ForegroundColor Green 