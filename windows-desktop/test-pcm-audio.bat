@echo off
echo ========================================
echo PCM 16-bit Audio Compatibility Test
echo ========================================
echo.

echo This test verifies that the desktop app can use
echo the same PCM 16-bit audio format as the Android app.
echo.

echo Starting PCM compatibility test...
npx electron test-pcm-audio.js

echo.
echo PCM compatibility test completed.
echo Check the console output above for results.
echo.

echo Press any key to continue...
pause 