@echo off
echo ========================================
echo Audio Stability Test
echo ========================================
echo.

echo This test verifies that the audio system is stable
echo and won't cause DevTools disconnection.
echo.

echo Starting audio stability test...
npx electron test-audio-stability.js

echo.
echo Audio stability test completed.
echo Check the console output above for results.
echo.

echo Press any key to continue...
pause 