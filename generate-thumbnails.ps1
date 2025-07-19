# Zell0 Video Thumbnail Generator
# This script generates thumbnails for all videos in X: drive
# Requires FFmpeg to be installed and in PATH

param(
    [string]$VideoDrive = "X:",
    [string]$ThumbnailDrive = "X:",
    [string]$ThumbnailFolder = "thumbnails",
    [int]$ThumbnailWidth = 320,
    [int]$ThumbnailHeight = 180
)

Write-Host "🎬 Zell0 Video Thumbnail Generator" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Video Drive: $VideoDrive" -ForegroundColor Yellow
Write-Host "Thumbnail Drive: $ThumbnailDrive\$ThumbnailFolder" -ForegroundColor Yellow
Write-Host "Thumbnail Size: ${ThumbnailWidth}x${ThumbnailHeight}" -ForegroundColor Yellow
Write-Host ""

# Check if FFmpeg is available
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($ffmpegVersion -like "*ffmpeg version*") {
        Write-Host "✅ FFmpeg found: $ffmpegVersion" -ForegroundColor Green
    } else {
        throw "FFmpeg not found"
    }
} catch {
    Write-Host "❌ FFmpeg not found! Please install FFmpeg and add it to your PATH." -ForegroundColor Red
    Write-Host "Download from: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Create thumbnails directory if it doesn't exist
$thumbnailPath = "$ThumbnailDrive\$ThumbnailFolder"
if (!(Test-Path $thumbnailPath)) {
    New-Item -ItemType Directory -Path $thumbnailPath -Force | Out-Null
    Write-Host "📁 Created thumbnails directory: $thumbnailPath" -ForegroundColor Green
}

# Get all video files from X: drive
$videoExtensions = @("*.mp4", "*.mov", "*.webm", "*.mkv", "*.avi", "*.wmv", "*.flv", "*.m4v")
$videoFiles = @()

foreach ($ext in $videoExtensions) {
    $files = Get-ChildItem -Path $VideoDrive -Filter $ext -Recurse -ErrorAction SilentlyContinue
    $videoFiles += $files
}

Write-Host "📹 Found $($videoFiles.Count) video files" -ForegroundColor Cyan

if ($videoFiles.Count -eq 0) {
    Write-Host "❌ No video files found in $VideoDrive" -ForegroundColor Red
    exit 1
}

# Process each video file
$processed = 0
$skipped = 0
$errors = 0

foreach ($videoFile in $videoFiles) {
    $videoName = $videoFile.BaseName
    $videoExt = $videoFile.Extension
    $thumbnailFile = "$thumbnailPath\$videoName.jpg"
    
    Write-Host "🎬 Processing: $($videoFile.Name)" -ForegroundColor White
    
    # Check if thumbnail already exists and is newer than video
    if (Test-Path $thumbnailFile) {
        $videoTime = $videoFile.LastWriteTime
        $thumbTime = (Get-Item $thumbnailFile).LastWriteTime
        
        if ($thumbTime -gt $videoTime) {
            Write-Host "  ⏭️  Thumbnail exists and is newer, skipping..." -ForegroundColor Yellow
            $skipped++
            continue
        }
    }
    
    try {
        # Generate thumbnail using FFmpeg
        $ffmpegArgs = @(
            "-i", "`"$($videoFile.FullName)`"",
            "-ss", "00:00:05",  # Seek to 5 seconds into video
            "-vframes", "1",    # Extract 1 frame
            "-vf", "scale=${ThumbnailWidth}:${ThumbnailHeight}:force_original_aspect_ratio=decrease,pad=${ThumbnailWidth}:${ThumbnailHeight}:(ow-iw)/2:(oh-ih)/2",
            "-q:v", "2",        # High quality
            "-y",               # Overwrite output
            "`"$thumbnailFile`""
        )
        
        $ffmpegProcess = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -Wait -PassThru -NoNewWindow
        
        if ($ffmpegProcess.ExitCode -eq 0) {
            Write-Host "  ✅ Thumbnail created: $videoName.jpg" -ForegroundColor Green
            $processed++
        } else {
            Write-Host "  ❌ FFmpeg failed with exit code: $($ffmpegProcess.ExitCode)" -ForegroundColor Red
            $errors++
        }
    } catch {
        Write-Host "  ❌ Error processing $($videoFile.Name): $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

# Summary
Write-Host ""
Write-Host "🎬 Thumbnail Generation Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ Processed: $processed" -ForegroundColor Green
Write-Host "⏭️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "❌ Errors: $errors" -ForegroundColor Red
Write-Host "📁 Thumbnails saved to: $thumbnailPath" -ForegroundColor Cyan

if ($errors -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Some videos failed to process. Check the errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your Zell0 server to pick up the new thumbnails" -ForegroundColor White
Write-Host "2. Videos will now load much faster in the Android app!" -ForegroundColor White 