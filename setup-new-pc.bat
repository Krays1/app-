@echo off
title Zell0 Project Setup - New PC Installation
color 0B
echo.
echo =============================================
echo    Zell0 Project Setup - New PC
echo    Automated Installation Script
echo =============================================
echo.

echo 🔍 Checking system requirements...
echo.

REM Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java JDK not found!
    echo    Please install Java JDK 17 from: https://adoptium.net/temurin/releases/?version=17
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Java JDK found
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo    Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    echo    Please install Node.js (includes npm) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ npm found
)

echo.
echo ✅ All system requirements met!
echo.

echo 🚀 Starting Zell0 project setup...
echo.

REM Check if we're in the right directory
if not exist "app\build.gradle.kts" (
    echo ❌ Android app not found in current directory!
    echo    Please run this script from the zell0 project root folder.
    echo.
    pause
    exit /b 1
)

if not exist "windows-server\package.json" (
    echo ❌ Windows server not found in current directory!
    echo    Please run this script from the zell0 project root folder.
    echo.
    pause
    exit /b 1
)

echo 📦 Installing Windows Server dependencies...
cd windows-server
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Windows server dependencies!
    pause
    exit /b 1
)
echo ✅ Windows server dependencies installed
cd ..

echo.
echo 📦 Installing Desktop App dependencies...
cd windows-desktop
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install desktop app dependencies!
    pause
    exit /b 1
)
echo ✅ Desktop app dependencies installed
cd ..

echo.
echo 📦 Installing Simple Server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install simple server dependencies!
    pause
    exit /b 1
)
echo ✅ Simple server dependencies installed
cd ..

echo.
echo 🔧 Testing VPN connectivity...
ping -n 1 172.94.3.216 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Cannot ping VPN IP 172.94.3.216
    echo    Make sure VPN is connected before running the server
    echo.
) else (
    echo ✅ VPN connectivity confirmed
)

echo.
echo 🎯 Setup Complete!
echo.
echo 📋 Next Steps:
echo    1. Open Android Studio and open the 'app' folder
echo    2. Let Gradle sync and download Android dependencies
echo    3. Install required Android SDK components if prompted
echo    4. Test the server: cd windows-server && START-VPN-SERVER.bat
echo    5. Build Android APK: gradlew assembleRelease
echo.
echo 📚 For detailed instructions, see: MIGRATION-GUIDE.md
echo.

pause 