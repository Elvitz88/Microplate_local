# Export all Docker images used by docker-compose.apps.yml for offline/on-site deployment.
# Run from: Backend-Microplate-infra (parent of scripts/)
# Usage: .\scripts\export-images-for-offline.ps1 [-Build] [-OutDir "offline-images"]

param(
    [switch]$Build,   # Run docker compose build first (to ensure all images exist)
    [string]$OutDir = "offline-images"
)

$ErrorActionPreference = "Stop"
$RepoRoot = if ($env:MICROPLATE_REPO_ROOT) { $env:MICROPLATE_REPO_ROOT } else { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
$ComposeFile = Join-Path $RepoRoot "docker-compose.apps.yml"
$ExportPath = Join-Path $RepoRoot $OutDir

Write-Host "Backend-Microplate-infra: $RepoRoot" -ForegroundColor Cyan
Write-Host "Export directory:         $ExportPath" -ForegroundColor Cyan
Write-Host ""

if ($Build) {
    Write-Host "Building all images..." -ForegroundColor Yellow
    Set-Location $RepoRoot
    docker compose -f $ComposeFile build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed. Fix errors and run again." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build done." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Getting image list from compose..." -ForegroundColor Yellow
Set-Location $RepoRoot
$images = docker compose -f $ComposeFile config --images 2>$null
if (-not $images) {
    Write-Host "Failed to get image list. Is Docker running?" -ForegroundColor Red
    exit 1
}

$imageList = $images -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
Write-Host "Found $($imageList.Count) images." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $ExportPath)) {
    New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
    Write-Host "Created $ExportPath" -ForegroundColor Green
}

foreach ($img in $imageList) {
    # Filename: replace : with - and / with _
    $safeName = $img -replace "[:/]", "-"
    $tarPath = Join-Path $ExportPath "$safeName.tar"
    Write-Host "Saving $img -> $safeName.tar" -ForegroundColor Gray
    docker save -o $tarPath $img
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to save $img" -ForegroundColor Red
        exit 1
    }
    $size = (Get-Item $tarPath).Length / 1MB
    Write-Host "  OK ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Export complete. Copy the following to the on-site machine:" -ForegroundColor Cyan
Write-Host "  1. The full project folder (Microplate_local_latest or same structure)" -ForegroundColor White
Write-Host "  2. The folder: $ExportPath" -ForegroundColor White
Write-Host ""
Write-Host "On the on-site machine, run:" -ForegroundColor Cyan
Write-Host "  cd Backend-Microplate-infra\$OutDir" -ForegroundColor White
Write-Host "  Get-ChildItem *.tar | ForEach-Object { docker load -i `$_.FullName }" -ForegroundColor White
Write-Host "  docker network create microplate-network" -ForegroundColor White
Write-Host "  cd .. ; .\scripts\setup-local-docker.ps1" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.apps.yml up -d" -ForegroundColor White
Write-Host ""
