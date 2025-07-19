# Simple Thumbnail Generator for Zell0 Videos
# This script generates thumbnails for videos on X: drive

Write-Host "Zell0 Simple Thumbnail Generator" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if X: drive exists
if (!(Test-Path "X:\")) {
    Write-Host "X: drive not found!" -ForegroundColor Red
    Write-Host "Please make sure your X: drive is mounted and accessible." -ForegroundColor Yellow
    exit 1
}

# Create thumbnails directory
$thumbnailsDir = "X:\thumbnails"
if (!(Test-Path $thumbnailsDir)) {
    Write-Host "Creating thumbnails directory: $thumbnailsDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $thumbnailsDir -Force | Out-Null
}

# Check if FFmpeg is available
$ffmpegAvailable = $false
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($ffmpegVersion -like "*ffmpeg version*") {
        Write-Host "FFmpeg found: $ffmpegVersion" -ForegroundColor Green
        $ffmpegAvailable = $true
    }
} catch {
    Write-Host "FFmpeg not found - will use alternative method" -ForegroundColor Yellow
}

# Get all video files
Write-Host "Scanning for video files on X: drive..." -ForegroundColor Yellow
$videoExtensions = @("*.mp4", "*.avi", "*.mov", "*.mkv", "*.wmv", "*.flv", "*.webm")
$videoFiles = @()

foreach ($ext in $videoExtensions) {
    $files = Get-ChildItem -Path "X:\" -Filter $ext -File -ErrorAction SilentlyContinue
    $videoFiles += $files
}

Write-Host "Found $($videoFiles.Count) video files" -ForegroundColor Cyan

if ($videoFiles.Count -eq 0) {
    Write-Host "No video files found on X: drive" -ForegroundColor Red
    exit 1
}

# Generate thumbnails
$processedCount = 0
$skippedCount = 0

foreach ($video in $videoFiles) {
    $thumbnailPath = Join-Path $thumbnailsDir "$($video.BaseName).jpg"
    
    # Check if thumbnail already exists
    if (Test-Path $thumbnailPath) {
        Write-Host "Skipping $($video.Name) - thumbnail already exists" -ForegroundColor Gray
        $skippedCount++
        continue
    }
    
    Write-Host "Processing: $($video.Name)" -ForegroundColor Yellow
    
    if ($ffmpegAvailable) {
        # Use FFmpeg to generate thumbnail
        try {
            $ffmpegArgs = @(
                "-i", "`"$($video.FullName)`"",
                "-ss", "00:00:05",  # Seek to 5 seconds
                "-vframes", "1",    # Extract 1 frame
                "-vf", "scale=320:240",  # Scale to 320x240
                "-y",               # Overwrite output
                "`"$thumbnailPath`""
            )
            
            $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -Wait -PassThru -NoNewWindow
            if ($process.ExitCode -eq 0) {
                Write-Host "Generated thumbnail for $($video.Name)" -ForegroundColor Green
                $processedCount++
            } else {
                Write-Host "Failed to generate thumbnail for $($video.Name)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Error generating thumbnail for $($video.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        # Alternative: Create a placeholder thumbnail
        Write-Host "Creating placeholder thumbnail for $($video.Name)" -ForegroundColor Yellow
        
        # Create a simple text-based placeholder
        $placeholderContent = @"
<svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="240" fill="#2c3e50"/>
    <text x="160" y="120" font-family="Arial" font-size="16" fill="white" text-anchor="middle">$($video.BaseName)</text>
    <text x="160" y="140" font-family="Arial" font-size="12" fill="#bdc3c7" text-anchor="middle">Video Thumbnail</text>
</svg>
"@
        
        try {
            $placeholderContent | Out-File -FilePath $thumbnailPath -Encoding UTF8
            Write-Host "Created placeholder for $($video.Name)" -ForegroundColor Green
            $processedCount++
        } catch {
            Write-Host "Failed to create placeholder for $($video.Name)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Thumbnail Generation Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Processed: $processedCount videos" -ForegroundColor Green
Write-Host "Skipped: $skippedCount videos" -ForegroundColor Yellow
Write-Host "Thumbnails saved to: $thumbnailsDir" -ForegroundColor Cyan

if (!$ffmpegAvailable) {
    Write-Host ""
    Write-Host "To generate real video thumbnails:" -ForegroundColor Yellow
    Write-Host "1. Install FFmpeg manually from: https://ffmpeg.org/download.html" -ForegroundColor White
    Write-Host "2. Or run: winget install Gyan.FFmpeg" -ForegroundColor White
    Write-Host "3. Then run this script again" -ForegroundColor White
}

Write-Host ""
Write-Host "You can now restart your Zell0 server to use the thumbnails!" -ForegroundColor Green 