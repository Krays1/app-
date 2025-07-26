# Android Studio Crash Fix Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Android Studio Crash Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Android Studio processes
Write-Host "[1/7] Stopping Android Studio processes..." -ForegroundColor Yellow
$processes = @("studio64", "java")
foreach ($process in $processes) {
    Get-Process -Name $process -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Stopped $process processes" -ForegroundColor Green
}
Start-Sleep -Seconds 3

# Step 2: Clear Android Studio caches
Write-Host "[2/7] Clearing Android Studio caches..." -ForegroundColor Yellow
$androidStudioPaths = @(
    "$env:APPDATA\Google\AndroidStudio4.1\system\caches",
    "$env:APPDATA\Google\AndroidStudio4.1\system\log", 
    "$env:APPDATA\Google\AndroidStudio4.1\system\index",
    "$env:APPDATA\Google\AndroidStudio4.2\system\caches",
    "$env:APPDATA\Google\AndroidStudio4.2\system\log",
    "$env:APPDATA\Google\AndroidStudio4.2\system\index"
)

foreach ($path in $androidStudioPaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force
        Write-Host "Cleared: $path" -ForegroundColor Green
    }
}

# Step 3: Clear Gradle cache
Write-Host "[3/7] Clearing Gradle cache..." -ForegroundColor Yellow
$gradleCache = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCache) {
    Remove-Item -Path $gradleCache -Recurse -Force
    Write-Host "Gradle cache cleared" -ForegroundColor Green
} else {
    Write-Host "Gradle cache not found" -ForegroundColor Yellow
}

# Step 4: Clear project build files
Write-Host "[4/7] Clearing project build files..." -ForegroundColor Yellow
$buildDirs = @("build", ".gradle", "app\build")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "Cleared: $dir" -ForegroundColor Green
    }
}

# Step 5: Clean project
Write-Host "[5/7] Cleaning project..." -ForegroundColor Yellow
try {
    & .\gradlew clean
    Write-Host "Project cleaned successfully" -ForegroundColor Green
} catch {
    Write-Host "Error: Gradle clean failed!" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Step 6: Build project
Write-Host "[6/7] Building project..." -ForegroundColor Yellow
try {
    & .\gradlew assembleDebug
    Write-Host "Build successful!" -ForegroundColor Green
} catch {
    Write-Host "Error: Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Step 7: System information
Write-Host "[7/7] System information..." -ForegroundColor Yellow
$ram = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
$freeRam = [math]::Round((Get-WmiObject -Class Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
Write-Host "Total RAM: $ram GB" -ForegroundColor Cyan
Write-Host "Free RAM: $freeRam GB" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Open Android Studio" -ForegroundColor White
Write-Host "2. Go to Help > Edit Custom VM Options" -ForegroundColor White
Write-Host "3. Add these lines:" -ForegroundColor White
Write-Host "   -Xmx4096m" -ForegroundColor Gray
Write-Host "   -XX:MaxPermSize=512m" -ForegroundColor Gray
Write-Host "   -XX:ReservedCodeCacheSize=512m" -ForegroundColor Gray
Write-Host "   -XX:+UseG1GC" -ForegroundColor Gray
Write-Host "   -XX:MaxGCPauseMillis=200" -ForegroundColor Gray
Write-Host "   -XX:+UseStringDeduplication" -ForegroundColor Gray
Write-Host "   -XX:+OptimizeStringConcat" -ForegroundColor Gray
Write-Host "4. Restart Android Studio" -ForegroundColor White
Write-Host "5. Go to File > Invalidate Caches and Restart" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   If the error persists:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Update Android Studio to latest version" -ForegroundColor White
Write-Host "2. Ensure you have 8GB+ RAM available" -ForegroundColor White
Write-Host "3. Close other memory-intensive applications" -ForegroundColor White
Write-Host "4. Try running Android Studio as Administrator" -ForegroundColor White
Write-Host "5. Check Windows Event Viewer for system errors" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to continue" 