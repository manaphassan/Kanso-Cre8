@echo off
title SS-CAM Android Virtual Device
echo ========================================================
echo   Launching SS-CAM Android Virtual Device (medium_phone)
echo ========================================================
echo.

set SDK_EMULATOR=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe

if not exist "%SDK_EMULATOR%" (
    echo Error: Android emulator not found at %SDK_EMULATOR%
    pause
    exit /b 1
)

echo Starting emulator window...
"%SDK_EMULATOR%" -avd medium_phone -gpu auto

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Emulator exited with code %ERRORLEVEL%.
    pause
)
