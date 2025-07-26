@echo off
echo ========================================
echo Android Audio Compatibility Test
echo ========================================
echo.

echo This test verifies that the desktop app can properly
echo handle Android PCM 16-bit audio format.
echo.

echo Starting Android audio compatibility test...
npx electron test-android-audio.js

echo.
echo Android audio compatibility test completed.
echo Check the console output above for results.
echo.

echo Press any key to continue...
pause 