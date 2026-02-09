@echo off
REM Restart Device Capture Service (Force kill and restart)
echo Stopping Device Capture Service...

REM Kill any running Python process for Device service
taskkill /F /FI "WINDOWTITLE eq Device*" 2>nul
taskkill /F /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *Device*" 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

echo Starting Device Capture Service...
cd /d D:\Microplate_Services\Device
start "Device Capture Service" python run.py

echo.
echo Device Capture Service restarted!
echo Check the new window for logs.
pause
