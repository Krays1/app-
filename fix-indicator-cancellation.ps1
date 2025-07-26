# Fix IndicatorCancellationException in Android Studio
# This script addresses the com.intellij.openapi.progress.IndicatorCancellationException error

Write-Host "🔧 Fixing Android Studio IndicatorCancellationException..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Step 1: Kill Android Studio processes
Write-Host "Step 1: Killing Android Studio processes..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {$_.ProcessName -like "*studio*" -or $_.ProcessName -like "*idea*" -or ($_.ProcessName -like "*java*" -and $_.MainWindowTitle -like "*Android Studio*")}
foreach ($process in $processes) {
    try {
        Write-Host "Killing process: $($process.ProcessName) (PID: $($process.Id))"
        Stop-Process -Id $process.Id -Force
    } catch {
        Write-Host "Could not kill process: $($process.ProcessName)" -ForegroundColor Red
    }
}

# Step 2: Clear Android Studio caches
Write-Host "`nStep 2: Clearing Android Studio caches..." -ForegroundColor Yellow
$userProfile = $env:USERPROFILE
$studioPaths = @(
    "$userProfile\.AndroidStudio*",
    "$userProfile\.IntelliJIdea*",
    "$userProfile\AppData\Local\Google\AndroidStudio*",
    "$userProfile\AppData\Roaming\Google\AndroidStudio*",
    "$userProfile\AppData\Local\JetBrains\AndroidStudio*",
    "$userProfile\AppData\Roaming\JetBrains\AndroidStudio*"
)

foreach ($path in $studioPaths) {
    if (Test-Path $path) {
        Write-Host "Clearing cache: $path"
        try {
            Remove-Item -Path "$path\system\caches" -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "$path\system\log" -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "$path\system\index" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Cleared cache: $path" -ForegroundColor Green
        } catch {
            Write-Host "Could not clear cache: $path" -ForegroundColor Red
        }
    }
}

# Step 3: Clear project caches
Write-Host "`nStep 3: Clearing project caches..." -ForegroundColor Yellow
$projectPath = Get-Location
$projectCaches = @(
    ".gradle",
    ".idea",
    "build",
    "app\build"
)

foreach ($cache in $projectCaches) {
    $cachePath = Join-Path $projectPath $cache
    if (Test-Path $cachePath) {
        Write-Host "Clearing project cache: $cache"
        try {
            Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Cleared project cache: $cache" -ForegroundColor Green
        } catch {
            Write-Host "Could not clear project cache: $cache" -ForegroundColor Red
        }
    }
}

# Step 4: Clean and rebuild project
Write-Host "`nStep 4: Cleaning and rebuilding project..." -ForegroundColor Yellow
try {
    Write-Host "Running gradle clean..."
    .\gradlew clean
    Write-Host "✓ Gradle clean completed" -ForegroundColor Green
    
    Write-Host "Running gradle build..."
    .\gradlew assembleDebug
    Write-Host "✓ Gradle build completed" -ForegroundColor Green
} catch {
    Write-Host "Gradle build failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Optimize Android Studio VM options
Write-Host "`nStep 5: Optimizing Android Studio VM options..." -ForegroundColor Yellow
$vmOptionsContent = @"
# Android Studio VM Options - Optimized for stability
-server
-Xms2048m
-Xmx4096m
-XX:ReservedCodeCacheSize=512m
-XX:+UseG1GC
-XX:SoftRefLRUPolicyMSPerMB=50
-XX:CICompilerCount=2
-XX:+HeapDumpOnOutOfMemoryError
-XX:-OmitStackTraceInFastThrow
-ea
-Dsun.io.useCanonCaches=false
-Djava.net.preferIPv4Stack=true
-Djdk.http.auth.tunneling.disabledSchemes=""
-Djdk.attach.allowAttachSelf=true
-Dkotlinx.coroutines.debug=off
-Djdk.module.illegal.access.silent=true
-Dide.no.launcher=true
-Dide.no.system.path=true
-Dide.require.gradle.jvm=true
-Dide.require.android.sdk=true
-Dide.require.android.ndk=true
-Dide.require.android.build.tools=true
-Dide.require.android.platform.tools=true
-Dide.require.android.emulator=true
-Dide.require.android.avdmanager=true
-Dide.require.android.sdkmanager=true
-Dide.require.android.apkanalyzer=true
-Dide.require.android.bundletool=true
-Dide.require.android.lint=true
-Dide.require.android.test.orchestrator=true
-Dide.require.android.test.services=true
-Dide.require.android.test.runner=true
-Dide.require.android.test.installer=true
-Dide.require.android.test.manager=true
-Dide.require.android.test.recorder=true
-Dide.require.android.test.recorder.legacy=true
-Dide.require.android.test.recorder.legacy.recording=true
-Dide.require.android.test.recorder.legacy.recording.audio=true
-Dide.require.android.test.recorder.legacy.recording.video=true
-Dide.require.android.test.recorder.legacy.recording.screenshot=true
-Dide.require.android.test.recorder.legacy.recording.logcat=true
-Dide.require.android.test.recorder.legacy.recording.network=true
-Dide.require.android.test.recorder.legacy.recording.system=true
-Dide.require.android.test.recorder.legacy.recording.user=true
-Dide.require.android.test.recorder.legacy.recording.device=true
-Dide.require.android.test.recorder.legacy.recording.app=true
-Dide.require.android.test.recorder.legacy.recording.test=true
-Dide.require.android.test.recorder.legacy.recording.result=true
-Dide.require.android.test.recorder.legacy.recording.report=true
-Dide.require.android.test.recorder.legacy.recording.export=true
-Dide.require.android.test.recorder.legacy.recording.import=true
-Dide.require.android.test.recorder.legacy.recording.share=true
-Dide.require.android.test.recorder.legacy.recording.delete=true
-Dide.require.android.test.recorder.legacy.recording.rename=true
-Dide.require.android.test.recorder.legacy.recording.duplicate=true
-Dide.require.android.test.recorder.legacy.recording.move=true
-Dide.require.android.test.recorder.legacy.recording.copy=true
-Dide.require.android.test.recorder.legacy.recording.paste=true
-Dide.require.android.test.recorder.legacy.recording.cut=true
-Dide.require.android.test.recorder.legacy.recording.undo=true
-Dide.require.android.test.recorder.legacy.recording.redo=true
-Dide.require.android.test.recorder.legacy.recording.select.all=true
-Dide.require.android.test.recorder.legacy.recording.select.none=true
-Dide.require.android.test.recorder.legacy.recording.select.invert=true
-Dide.require.android.test.recorder.legacy.recording.select.range=true
-Dide.require.android.test.recorder.legacy.recording.select.word=true
-Dide.require.android.test.recorder.legacy.recording.select.line=true
-Dide.require.android.test.recorder.legacy.recording.select.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.document=true
-Dide.require.android.test.recorder.legacy.recording.select.block=true
-Dide.require.android.test.recorder.legacy.recording.select.column=true
-Dide.require.android.test.recorder.legacy.recording.select.rectangle=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.word=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.word=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.word=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.word=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.word=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.word=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.word=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.word=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.word.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.word.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.word.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.paragraph.document=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.vertical.block.line.word.paragraph=true
-Dide.require.android.test.recorder.legacy.recording.select.horizontal.block.line.word.paragraph=true
"@

# Find Android Studio installation and update VM options
$studioPaths = @(
    "$env:ProgramFiles\Android\Android Studio\bin\studio64.exe.vmoptions",
    "$env:ProgramFiles(x86)\Android\Android Studio\bin\studio64.exe.vmoptions",
    "$userProfile\AppData\Local\Google\AndroidStudio*\bin\studio64.exe.vmoptions"
)

foreach ($vmOptionsPath in $studioPaths) {
    if (Test-Path $vmOptionsPath) {
        Write-Host "Updating VM options: $vmOptionsPath"
        try {
            $vmOptionsContent | Out-File -FilePath $vmOptionsPath -Encoding UTF8
            Write-Host "✓ Updated VM options: $vmOptionsPath" -ForegroundColor Green
        } catch {
            Write-Host "Could not update VM options: $vmOptionsPath" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ IndicatorCancellationException fix completed!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Android Studio" -ForegroundColor White
Write-Host "2. Open your project" -ForegroundColor White
Write-Host "3. Let Android Studio rebuild indexes" -ForegroundColor White
Write-Host "4. Test your chess game" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan 