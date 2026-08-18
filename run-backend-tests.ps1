param(
    [string]$Target = "tests"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting backend test runtime..."
docker compose up -d postgres backend
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Running backend tests: $Target"
docker compose exec backend python -m pytest $Target
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
