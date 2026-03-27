#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs ControlPlane.Agent as a Windows Service.

.DESCRIPTION
    This script installs the ControlPlane.Agent as a Windows Service with
    auto-start capability and failure recovery settings.

.PARAMETER BinaryPath
    Path to the ControlPlane.Agent.exe file. Defaults to .\publish\ControlPlane.Agent.exe

.PARAMETER ServiceName
    Name of the Windows Service. Defaults to "ControlPlane.Agent"

.EXAMPLE
    .\install-service.ps1
    .\install-service.ps1 -BinaryPath "C:\Program Files\HumanFirst\ControlPlane.Agent.exe"
#>

param(
    [string]$BinaryPath = ".\publish\ControlPlane.Agent.exe",
    [string]$ServiceName = "ControlPlane.Agent"
)

$ErrorActionPreference = "Stop"

Write-Host "Installing ControlPlane.Agent as Windows Service..." -ForegroundColor Cyan

# Resolve full path
$FullBinaryPath = Resolve-Path $BinaryPath -ErrorAction SilentlyContinue
if (-not $FullBinaryPath) {
    Write-Error "Binary not found at: $BinaryPath`nRun 'dotnet publish -c Release -r win-x64 -o .\publish' first."
    exit 1
}

Write-Host "Binary path: $FullBinaryPath" -ForegroundColor Gray

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service '$ServiceName' already exists. Stopping..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

# Create the service
Write-Host "Creating service..." -ForegroundColor Gray
$result = sc.exe create $ServiceName binPath= "`"$FullBinaryPath`"" start= auto
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create service: $result"
    exit 1
}

# Set description
Write-Host "Setting service description..." -ForegroundColor Gray
sc.exe description $ServiceName "HumanFirst Control Plane Agent - system-level enforcement service" | Out-Null

# Set recovery options (restart on failure)
Write-Host "Configuring failure recovery..." -ForegroundColor Gray
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null

# Create log directory
$logDir = "C:\ProgramData\ControlPlane"
if (-not (Test-Path $logDir)) {
    Write-Host "Creating log directory: $logDir" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Start the service
Write-Host "Starting service..." -ForegroundColor Gray
Start-Service -Name $ServiceName

# Verify
Start-Sleep -Seconds 2
$service = Get-Service -Name $ServiceName
if ($service.Status -eq "Running") {
    Write-Host "`nService installed and running successfully!" -ForegroundColor Green
    Write-Host "  Name: $ServiceName"
    Write-Host "  Status: $($service.Status)"
    Write-Host "  Startup: Automatic"
    Write-Host "  Logs: $logDir\agent.log"
} else {
    Write-Warning "Service installed but not running. Status: $($service.Status)"
    Write-Host "Check logs at: $logDir\agent.log"
}
