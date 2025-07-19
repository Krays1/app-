@echo off
echo 🚀 Setting up Zell0 Server...
echo =============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    echo Then run this script again
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Start the server
echo 🚀 Starting Zell0 Server...
echo Server will run on port 3000
echo Press Ctrl+C to stop
echo =============================================

node server.js 