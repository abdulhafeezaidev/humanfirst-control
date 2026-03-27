#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Publishes and installs ControlPlane.Agent as a Windows Service.
.DESCRIPTION
    Run this script as Administrator:
      Right-click ? Run with PowerShell (as Admin)
    Or from an elevated terminal:
      powershell -ExecutionPolicy Bypass -File install-agent.ps1
#>

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$ServiceName = 'ControlPlane.Agent'
$AgentDir = Join-Path $PSScriptRoot 'agent\ControlPlane.Agent'
$PublishDir = Join-Path $AgentDir 'publish'
$AgentExe = Join-Path $PublishDir 'ControlPlane.Agent.exe'
$LogDir = 'C:\ProgramData\ControlPlane'

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '  Install ControlPlane.Agent Service' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

# Step 1: Publish
if (-not (Test-Path $AgentExe)) {
    Write-Host '[1/3] Publishing agent...' -ForegroundColor Yellow
    Push-Location $AgentDir
    dotnet publish -c Release -r win-x64 -o .\publish
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[ERROR] dotnet publish failed.' -ForegroundColor Red
        Read-Host 'Press Enter to exit'
        exit 1
    }
    Pop-Location
    Write-Host '  Published.' -ForegroundColor Green
} else {
    Write-Host '[1/3] Agent already published.' -ForegroundColor Green
}

# Step 2: Remove existing service if present
Write-Host '[2/3] Configuring service...' -ForegroundColor Yellow
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host '  Stopping existing service...'
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep 2
    Write-Host '  Old service removed.'
}

# Step 3: Create & start service
Write-Host '[3/3] Creating and starting service...' -ForegroundColor Yellow

# Create log directory
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# Create service
$result = sc.exe create $ServiceName binPath= "`"$AgentExe`"" start= auto
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] sc.exe create failed: $result" -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}

sc.exe description $ServiceName 'HumanFirst Control Plane Agent - system-level enforcement service' | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null

# Start
Start-Service -Name $ServiceName
Start-Sleep 2

$svc = Get-Service -Name $ServiceName
Write-Host ''
if ($svc.Status -eq 'Running') {
    Write-Host '============================================' -ForegroundColor Green
    Write-Host '  Agent service installed and RUNNING!' -ForegroundColor Green
    Write-Host "  Name:    $ServiceName"
    Write-Host "  Status:  $($svc.Status)"
    Write-Host "  Startup: Automatic"
    Write-Host "  Logs:    $LogDir\agent.log"
    Write-Host '============================================' -ForegroundColor Green
} else {
    Write-Host "  Service installed but status: $($svc.Status)" -ForegroundColor Yellow
    Write-Host "  Check logs: $LogDir\agent.log"
}

Write-Host ''
Read-Host 'Press Enter to close'
