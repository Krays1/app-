@echo off
echo ========================================
echo   IndicatorCancellationException Fix
echo ========================================
echo.

echo [1/5] Stopping Android Studio processes...
taskkill /f /im studio64.exe 2>nul
taskkill /f /im java.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/5] Cleaning Gradle cache...
if exist "%USERPROFILE%\.gradle\caches" (
    rmdir /s /q "%USERPROFILE%\.gradle\caches"
    echo Gradle cache cleared.
) else (
    echo Gradle cache not found.
)

echo [3/5] Cleaning project...
call gradlew clean
if %ERRORLEVEL% NEQ 0 (
    echo Error: Gradle clean failed!
    pause
    exit /b 1
)

echo [4/5] Building project...
call gradlew assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo Error: Build failed!
    pause
    exit /b 1
)

echo [5/5] Build successful!
echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo 1. Open Android Studio
echo 2. Go to Help ^> Edit Custom VM Options
echo 3. Add these lines:
echo    -Xmx4096m
echo    -XX:MaxPermSize=512m
echo    -XX:ReservedCodeCacheSize=512m
echo    -XX:+UseG1GC
echo    -XX:MaxGCPauseMillis=200
echo 4. Restart Android Studio
echo.
echo ========================================
pause 