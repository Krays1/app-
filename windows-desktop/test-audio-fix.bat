@echo off
echo ========================================
echo Audio Fix Test
echo ========================================
echo.

echo This test verifies that the audio fixes work correctly.
echo.

echo Starting audio fix test...
npx electron test-audio-fix.js

echo.
echo Audio fix test completed.
echo Check the console output above for results.
echo.

echo Press any key to continue...
pause 