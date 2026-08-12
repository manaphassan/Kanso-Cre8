@echo off
echo SS-CAM Screenshot Capture
echo ========================
echo.
echo This will launch SS-CAM and capture fresh screenshots.
echo Please do not click or move the mouse during capture.
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul
powershell.exe -ExecutionPolicy Bypass -File "%~dp0capture-interactive.ps1"
echo.
echo Done! Check docs\ folder for the new screenshots.
pause
