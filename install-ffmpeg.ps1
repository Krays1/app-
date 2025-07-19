# Zell0 FFmpeg Installer
# This script downloads and installs FFmpeg for Windows

Write-Host "🎬 Zell0 FFmpeg Installer" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Check if FFmpeg is already installed
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($ffmpegVersion -like "*ffmpeg version*") {
        Write-Host "✅ FFmpeg is already installed: $ffmpegVersion" -ForegroundColor Green
        Write-Host "No need to install FFmpeg!" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "FFmpeg not found, proceeding with installation..." -ForegroundColor Yellow
}

# Create temp directory
$tempDir = "$env:TEMP\zell0-ffmpeg"
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

Write-Host "📁 Using temp directory: $tempDir" -ForegroundColor Cyan

# Download FFmpeg
$ffmpegUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
$ffmpegZip = "$tempDir\ffmpeg.zip"
$ffmpegExtract = "$tempDir\ffmpeg-extract"

Write-Host "📥 Downloading FFmpeg..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $ffmpegZip -UseBasicParsing
    Write-Host "✅ Download completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract FFmpeg
Write-Host "📦 Extracting FFmpeg..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ffmpegZip -DestinationPath $ffmpegExtract -Force
    Write-Host "✅ Extraction completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Find the bin directory
$binDir = Get-ChildItem -Path $ffmpegExtract -Directory | Where-Object { $_.Name -like "*ffmpeg*" } | Select-Object -First 1
if (!$binDir) {
    Write-Host "❌ Could not find FFmpeg bin directory" -ForegroundColor Red
    exit 1
}

$ffmpegBin = Join-Path $binDir.FullName "bin"
if (!(Test-Path $ffmpegBin)) {
    Write-Host "❌ Could not find FFmpeg bin directory: $ffmpegBin" -ForegroundColor Red
    exit 1
}

# Copy FFmpeg to a permanent location
$installDir = "$env:USERPROFILE\zell0-ffmpeg"
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

Write-Host "📋 Installing FFmpeg to: $installDir" -ForegroundColor Yellow
try {
    Copy-Item -Path "$ffmpegBin\*" -Destination $installDir -Recurse -Force
    Write-Host "✅ Installation completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add to PATH for current session
$env:PATH = "$installDir;$env:PATH"

# Test installation
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($ffmpegVersion -like "*ffmpeg version*") {
        Write-Host "✅ FFmpeg installed successfully: $ffmpegVersion" -ForegroundColor Green
    } else {
        throw "FFmpeg not working"
    }
} catch {
    Write-Host "❌ FFmpeg installation test failed" -ForegroundColor Red
    exit 1
}

# Clean up
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 FFmpeg Installation Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ FFmpeg is now available in: $installDir" -ForegroundColor Cyan
Write-Host "✅ Added to PATH for this session" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To make FFmpeg permanently available:" -ForegroundColor Yellow
Write-Host "1. Add '$installDir' to your system PATH" -ForegroundColor White
Write-Host "2. Or run this script again when needed" -ForegroundColor White
Write-Host ""
Write-Host "🎬 You can now run GENERATE-THUMBNAILS.bat!" -ForegroundColor Green 