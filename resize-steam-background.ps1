# Steam Background Image Resizer
# This script will resize your Steam logo image for Android use

Write-Host "Steam Background Image Resizer" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if ImageMagick is available
try {
    $magickVersion = magick --version 2>$null
    Write-Host "✅ ImageMagick found" -ForegroundColor Green
} catch {
    Write-Host "❌ ImageMagick not found. Please install ImageMagick first." -ForegroundColor Red
    Write-Host "Download from: https://imagemagick.org/script/download.php#windows" -ForegroundColor Yellow
    exit 1
}

# Get the source image path
$sourcePath = Read-Host "Enter the full path to your Steam logo image (e.g., C:\Users\ALLAN\Downloads\steam_logo.png)"

if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ File not found: $sourcePath" -ForegroundColor Red
    exit 1
}

# Create output directory if it doesn't exist
$outputDir = "app\src\main\res\drawable"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force
    Write-Host "Created directory: $outputDir" -ForegroundColor Yellow
}

# Resize for different densities
$sizes = @{
    "mdpi" = 320
    "hdpi" = 480
    "xhdpi" = 720
    "xxhdpi" = 1080
    "xxxhdpi" = 1440
}

foreach ($density in $sizes.Keys) {
    $size = $sizes[$density]
    $outputPath = "$outputDir\steam_background_$density.png"
    
    Write-Host "Resizing for $density (${size}x${size})..." -ForegroundColor Cyan
    
    # Resize and maintain aspect ratio
    magick convert "$sourcePath" -resize "${size}x${size}^" -gravity center -extent "${size}x${size}" "$outputPath"
    
    if (Test-Path $outputPath) {
        Write-Host "✅ Created: $outputPath" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create: $outputPath" -ForegroundColor Red
    }
}

# Also create a default version
$defaultOutput = "$outputDir\steam_background.png"
Write-Host "Creating default version..." -ForegroundColor Cyan
magick convert "$sourcePath" -resize "720x720^" -gravity center -extent "720x720" "$defaultOutput"

if (Test-Path $defaultOutput) {
    Write-Host "✅ Created default: $defaultOutput" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create default: $defaultOutput" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Steam background image resizing complete!" -ForegroundColor Green
Write-Host "Now update the layout file to use 'steam_background' instead of 'ic_steam'" -ForegroundColor Yellow 