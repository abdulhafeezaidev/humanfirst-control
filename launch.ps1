<#
.SYNOPSIS
    HumanFirst Control � Desktop Launcher (PowerShell)
.DESCRIPTION
    Installs dependencies if needed, then launches the Electron desktop app.
#>

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '  HumanFirst Control - Desktop Launcher' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

# ?? Check Node.js ????????????????????????????????????????????
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host '[ERROR] Node.js is not installed.' -ForegroundColor Red
    Write-Host 'Please install Node.js LTS from https://nodejs.org' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host "[INFO] Node.js found: $(node --version)" -ForegroundColor Green

# ?? Install dependencies if needed ???????????????????????????
if (-not (Test-Path 'node_modules')) {
    Write-Host '[INFO] Installing dependencies (first run)...' -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[ERROR] npm install failed.' -ForegroundColor Red
        Read-Host 'Press Enter to exit'
        exit 1
    }
    Write-Host '[INFO] Dependencies installed.' -ForegroundColor Green
} else {
    Write-Host '[INFO] Dependencies already installed.' -ForegroundColor Green
}

# Free port 8080 if a stale dev server is still running
$portPids = @()
try {
    $portPids = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction Stop |
        Select-Object -ExpandProperty OwningProcess -Unique)
} catch {
    $portPids = @(
        netstat -ano |
        Select-String ':8080' |
        Select-String 'LISTENING' |
        ForEach-Object {
            $parts = ($_ -replace '^\s+', '') -split '\s+'
            if ($parts.Length -ge 5) { [int]$parts[4] }
        } |
        Select-Object -Unique
    )
}

foreach ($portPid in $portPids) {
    if ($portPid -gt 0) {
        Write-Host "[WARN] Port 8080 is in use by PID $portPid. Stopping stale process..." -ForegroundColor Yellow
        Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
    }
}

# Start ControlPlane.Agent if not already running
Write-Host ''
Write-Host '[INFO] Ensuring ControlPlane.Agent is running...' -ForegroundColor Cyan
$agentProc = Get-Process -Name 'ControlPlane.Agent' -ErrorAction SilentlyContinue
if (-not $agentProc) {
    $agentExe = Join-Path $PSScriptRoot 'agent\ControlPlane.Agent\publish\ControlPlane.Agent.exe'
    if (Test-Path $agentExe) {
        Write-Host '[INFO] Starting ControlPlane.Agent...' -ForegroundColor Yellow
        Start-Process -FilePath $agentExe -WindowStyle Hidden
        Write-Host '[INFO] ControlPlane.Agent started. Waiting for initialization...' -ForegroundColor Green
        Start-Sleep -Seconds 3
    } else {
        Write-Host "[WARN] ControlPlane.Agent.exe not found at $agentExe" -ForegroundColor Yellow
        Write-Host '[WARN] Agent pipe will not be available until manually started.' -ForegroundColor Yellow
    }
} else {
    Write-Host '[INFO] ControlPlane.Agent already running.' -ForegroundColor Green
}

Write-Host ''
Write-Host '[INFO] Launching HumanFirst Control desktop app...' -ForegroundColor Cyan
Write-Host '[INFO] The app window will open shortly.' -ForegroundColor Cyan
Write-Host ''

# ?? Launch Electron ??????????????????????????????????????????
& npm.cmd run desktop:dev

Read-Host 'Press Enter to exit'
