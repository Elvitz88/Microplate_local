@echo off
title Microplate Device Service
REM Start Device Capture Service
cd /d %~dp0
echo ==========================================
echo   Microplate Device Capture Service
echo ==========================================
echo.
echo   Port: 6407
echo   Camera: Basler (Pylon)
echo.
echo   [!] Make sure Pylon Viewer is CLOSED
echo       before starting this service.
echo.
echo ==========================================
echo.
echo Starting service...
echo.
python run.py
echo.
echo [Service stopped]
pause
