@echo off
REM ========================================
REM Frontend Startup Script (Windows)
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Starting Microplate Frontend
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found. Copying from .env.example...
    copy .env.example .env
    echo [OK] .env file created. Please update it with your configuration.
    echo.
)

REM Check if Docker network exists
docker network inspect microplate-network >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Network 'microplate-network' not found. Creating...
    docker network create microplate-network
    echo [OK] Network created.
    echo.
)

REM Check backend services
echo Checking backend services...
echo.

set ALL_RUNNING=1
for %%s in (
    microplate-auth-service
    microplate-image-ingestion-service
    microplate-vision-inference-api
    microplate-result-api-service
    microplate-labware-interface-service
    microplate-prediction-db-service
) do (
    docker ps --format "{{.Names}}" | findstr /r "^%%s$" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] %%s is not running
        set ALL_RUNNING=0
    ) else (
        echo [OK] %%s is running
    )
)

echo.

if !ALL_RUNNING!==0 (
    echo [WARNING] Some backend services are not running.
    echo Frontend will start, but may not work correctly.
    echo Please start backend services first:
    echo   cd ..\Backend-Microplate-infra
    echo   docker-compose up -d
    echo.
    set /p CONTINUE="Do you want to continue? (y/N): "
    if /i not "!CONTINUE!"=="y" (
        exit /b 1
    )
)

REM Ask deployment mode
echo.
echo Select deployment mode:
echo   1^) Frontend only (Port 6410^)
echo   2^) Frontend + API Gateway (Ports 6410, 6400^)
echo   3^) Development mode (Webpack dev server^)
echo.
set /p CHOICE="Enter choice [1-3]: "

if "%CHOICE%"=="1" (
    echo.
    echo [INFO] Starting Frontend only...
    docker-compose --profile frontend up -d --build
) else if "%CHOICE%"=="2" (
    echo.
    echo [INFO] Starting Frontend + API Gateway...
    docker-compose --profile frontend --profile gateway up -d --build
) else if "%CHOICE%"=="3" (
    echo.
    echo [INFO] Starting Development mode...
    if not exist node_modules (
        echo [INFO] Installing dependencies...
        call yarn install
    )
    call yarn dev
    exit /b 0
) else (
    echo [ERROR] Invalid choice
    exit /b 1
)

REM Wait for services
echo.
echo Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

REM Check health
curl -sf http://localhost:6410/health >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Frontend health check failed
    echo.
    echo Showing logs:
    docker-compose logs --tail=50 microplate-frontend
    exit /b 1
) else (
    echo [OK] Frontend is healthy!
    echo Access Frontend at: http://localhost:6410
)

if "%CHOICE%"=="2" (
    curl -sf http://localhost:6400/health >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] API Gateway health check failed
    ) else (
        echo [OK] API Gateway is healthy!
        echo Access API Gateway at: http://localhost:6400
    )
)

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo Useful commands:
echo   docker-compose logs -f microplate-frontend  # View logs
echo   docker-compose --profile frontend restart   # Restart
echo   docker-compose --profile frontend down      # Stop
echo.

pause
