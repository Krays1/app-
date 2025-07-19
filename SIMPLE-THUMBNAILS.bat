@echo off
title Zell0 Simple Thumbnail Generator
color 0A

echo.
echo ========================================
echo    Zell0 Simple Thumbnail Generator
echo ========================================
echo.

echo Starting thumbnail generation...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0simple-thumbnail-generator.ps1"

echo.
echo Press any key to exit...
pause >nul 