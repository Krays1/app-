@echo off
echo ========================================
echo   Android Studio Crash Fix
echo ========================================
echo.

echo [1/6] Stopping Android Studio processes...
taskkill /f /im studio64.exe 2>nul
taskkill /f /im java.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/6] Clearing Android Studio caches...
if exist "%APPDATA%\Google\AndroidStudio4.1\system\caches" (
    rmdir /s /q "%APPDATA%\Google\AndroidStudio4.1\system\caches"
    echo Android Studio caches cleared.
) else (
    echo Android Studio caches not found.
)

if exist "%APPDATA%\Google\AndroidStudio4.1\system\log" (
    rmdir /s /q "%APPDATA%\Google\AndroidStudio4.1\system\log"
    echo Android Studio logs cleared.
)

if exist "%APPDATA%\Google\AndroidStudio4.1\system\index" (
    rmdir /s /q "%APPDATA%\Google\AndroidStudio4.1\system\index"
    echo Android Studio index cleared.
)

echo [3/6] Clearing Gradle cache...
if exist "%USERPROFILE%\.gradle\caches" (
    rmdir /s /q "%USERPROFILE%\.gradle\caches"
    echo Gradle cache cleared.
) else (
    echo Gradle cache not found.
)

echo [4/6] Cleaning project...
call gradlew clean
if %ERRORLEVEL% NEQ 0 (
    echo Error: Gradle clean failed!
    pause
    exit /b 1
)

echo [5/6] Building project...
call gradlew assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo Error: Build failed!
    pause
    exit /b 1
)

echo [6/6] Build successful!
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
echo    -XX:+UseStringDeduplication
echo    -XX:+OptimizeStringConcat
echo 4. Restart Android Studio
echo 5. Go to File ^> Invalidate Caches and Restart
echo.
echo ========================================
echo   If the error persists:
echo ========================================
echo 1. Update Android Studio to latest version
echo 2. Ensure you have 8GB+ RAM available
echo 3. Close other memory-intensive applications
echo 4. Try running Android Studio as Administrator
echo.
pause 