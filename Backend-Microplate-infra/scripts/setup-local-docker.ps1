# Setup script for running Microplate stack locally with Docker
# Use: docker-compose.apps.yml (includes Postgres, RabbitMQ, and all app services)
# Run from: Backend-Microplate-infra (or set $RepoRoot correctly)

$ErrorActionPreference = "Stop"
$RepoRoot = if ($env:MICROPLATE_REPO_ROOT) { $env:MICROPLATE_REPO_ROOT } else { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
$ParentRoot = Split-Path $RepoRoot -Parent

Write-Host "Repo root (Backend-Microplate-infra): $RepoRoot" -ForegroundColor Cyan
Write-Host "Parent (Microplate_local_latest):     $ParentRoot" -ForegroundColor Cyan

# 1. Docker network (required: docker-compose.apps.yml uses external: true)
$net = "microplate-network"
$prevError = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$out = docker network inspect $net 2>$null
$exists = $LASTEXITCODE -eq 0
$ErrorActionPreference = $prevError
if (-not $exists) {
    Write-Host "Creating Docker network: $net" -ForegroundColor Yellow
    $ErrorActionPreference = "SilentlyContinue"
    docker network create $net 2>$null | Out-Null
    $ErrorActionPreference = $prevError
    if ($LASTEXITCODE -eq 0) { Write-Host "Created network: $net" -ForegroundColor Green }
    else { Write-Host "Skipped (create manually when Docker is running: docker network create $net)" -ForegroundColor Yellow }
} else {
    Write-Host "Docker network '$net' already exists." -ForegroundColor Green
}

# 2. Storage directory (bind mount in docker-compose.apps.yml -> ./storage)
$storagePath = Join-Path $RepoRoot "storage"
if (-not (Test-Path $storagePath)) {
    New-Item -ItemType Directory -Path $storagePath -Force | Out-Null
    Write-Host "Created storage directory: $storagePath" -ForegroundColor Yellow
} else {
    Write-Host "Storage directory exists: $storagePath" -ForegroundColor Green
}

# 3. .env in Backend-Microplate-infra (for POSTGRES_*, RABBITMQ_* when running compose)
$infraEnv = Join-Path $RepoRoot ".env"
$infraEnvExample = Join-Path $RepoRoot ".env.example"
if (-not (Test-Path $infraEnv) -and (Test-Path $infraEnvExample)) {
    Copy-Item $infraEnvExample $infraEnv
    Write-Host "Created $infraEnv from .env.example (review and edit if needed)." -ForegroundColor Yellow
} elseif (Test-Path $infraEnv) {
    Write-Host "Infra .env already exists: $infraEnv" -ForegroundColor Green
} else {
    Write-Host "No .env or .env.example in infra; using compose defaults." -ForegroundColor Gray
}

# 4. Per-service .env from env.example (compose references ../Backend-Microplate-*/.env)
$services = @(
    "Backend-Microplate-auth-service",
    "Backend-Microplate-image-ingestion-service",
    "Backend-Microplate-vision-inference-service",
    "Backend-Microplate-labware-interface-service",
    "Backend-Microplate-result-api-service",
    "Backend-Microplate-prediction-db-service"
)

foreach ($svc in $services) {
    $dir = Join-Path $ParentRoot $svc
    if (-not (Test-Path $dir)) {
        Write-Host "Skip (dir not found): $svc" -ForegroundColor Gray
        continue
    }
    $envPath = Join-Path $dir ".env"
    $examplePath = Join-Path $dir "env.example"
    $examplePath2 = Join-Path $dir ".env copy.example"
    if (Test-Path $envPath) {
        Write-Host "Service .env exists: $svc" -ForegroundColor Green
        continue
    }
    if (Test-Path $examplePath) {
        Copy-Item $examplePath $envPath
        Write-Host "Created .env from env.example: $svc" -ForegroundColor Yellow
    } elseif (Test-Path $examplePath2) {
        Copy-Item $examplePath2 $envPath
        Write-Host "Created .env from .env copy.example: $svc" -ForegroundColor Yellow
    } else {
        Write-Host "No env.example in $svc - add .env manually." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Setup done. To start the stack (from Backend-Microplate-infra):" -ForegroundColor Cyan
Write-Host "  cd `"$RepoRoot`"" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.apps.yml up -d" -ForegroundColor White
Write-Host ""
Write-Host "To run with build (after code changes):" -ForegroundColor Cyan
Write-Host "  docker compose -f docker-compose.apps.yml up -d --build" -ForegroundColor White
Write-Host ""
