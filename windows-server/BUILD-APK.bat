@echo off
title Building Zell0 Android APK
color 0B
echo.
echo =============================================
echo    Building Zell0 Walkie-Talkie APK
echo =============================================
echo.
echo Navigating to project root...
cd /d "%~dp0\.."
echo Current directory: %CD%
echo.
echo Starting Gradle build process...
echo This may take a few minutes...
echo.

call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =============================================
    echo    ✅ BUILD SUCCESSFUL!
    echo =============================================
    echo.
    echo Your APK is ready at:
    echo app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo File size:
    if exist "app\build\outputs\apk\debug\app-debug.apk" (
        for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do echo %%~zA bytes
        echo.
        echo You can now:
        echo 1. Install this APK on your Android device
        echo 2. Start the server with START-VPN-SERVER.bat
        echo 3. Test the walkie-talkie functionality!
    ) else (
        echo ❌ APK file not found in expected location
    )
) else (
    echo.
    echo ❌ BUILD FAILED!
    echo Check the error messages above.
)

echo.
pause 