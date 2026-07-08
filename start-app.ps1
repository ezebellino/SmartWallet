param(
  [switch]$Restart
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$backendPython = Join-Path $backend ".venv\Scripts\python.exe"
$frontendLog = Join-Path $frontend ".next-start.out.log"
$frontendErr = Join-Path $frontend ".next-start.err.log"
$backendLog = Join-Path $backend ".uvicorn.out.log"
$backendErr = Join-Path $backend ".uvicorn.err.log"

function Get-ListeningPid([int]$Port) {
  $rows = netstat -ano | Select-String "LISTENING" | Select-String ":$Port "
  foreach ($row in $rows) {
    $parts = $row.ToString().Trim() -split "\s+"
    if ($parts.Length -gt 4) {
      $parts[-1]
    }
  }
}

function Stop-Port([int]$Port) {
  $pids = @(Get-ListeningPid $Port | Sort-Object -Unique)
  foreach ($pidValue in $pids) {
    if ($pidValue -match "^\d+$") {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
    }
  }
}

function Wait-HttpOk([string]$Url, [int]$Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 800
    }
  } while ((Get-Date) -lt $deadline)

  return $false
}

if ($Restart) {
  Stop-Port 3000
  Stop-Port 8000
}

if (-not (Test-Path $backendPython)) {
  throw "No se encontro el entorno virtual del backend en $backendPython"
}

Push-Location $backend
try {
  & $backendPython -m alembic upgrade head
} finally {
  Pop-Location
}

if (-not (Get-ListeningPid 8000)) {
  Start-Process -FilePath $backendPython -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $backend -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr -WindowStyle Hidden
}

if (-not (Wait-HttpOk "http://127.0.0.1:8000/health" 20)) {
  throw "El backend no respondio en http://127.0.0.1:8000/health. Revisar $backendErr"
}

Push-Location $frontend
try {
  npm.cmd run build
} finally {
  Pop-Location
}

if (-not (Get-ListeningPid 3000)) {
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start" -WorkingDirectory $frontend -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr -WindowStyle Hidden
}

if (-not (Wait-HttpOk "http://127.0.0.1:3000" 25)) {
  throw "El frontend no respondio en http://127.0.0.1:3000. Revisar $frontendErr"
}

Write-Host "Smart Wallet AI esta listo:"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000/health"
