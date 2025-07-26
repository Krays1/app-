@echo off
echo 🔧 Fixing Android Studio IndicatorCancellationException...
echo ==================================================

echo Step 1: Killing Android Studio processes...
taskkill /f /im studio64.exe 2>nul
taskkill /f /im java.exe 2>nul
taskkill /f /im idea64.exe 2>nul

echo.
echo Step 2: Clearing project caches...
if exist .gradle rmdir /s /q .gradle
if exist .idea rmdir /s /q .idea
if exist build rmdir /s /q build
if exist app\build rmdir /s /q app\build

echo.
echo Step 3: Cleaning and rebuilding project...
call gradlew clean
call gradlew assembleDebug

echo.
echo ✅ Fix completed!
echo ==================================================
echo Next steps:
echo 1. Restart Android Studio
echo 2. Open your project
echo 3. Let Android Studio rebuild indexes
echo 4. Test your chess game
echo ==================================================
pause 