#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Uninstalls the ControlPlane.Agent Windows Service.

.PARAMETER ServiceName
    Name of the Windows Service. Defaults to "ControlPlane.Agent"

.PARAMETER RemoveLogs
    If specified, also removes the log directory.

.EXAMPLE
    .\uninstall-service.ps1
    .\uninstall-service.ps1 -RemoveLogs
#>

param(
    [string]$ServiceName = "ControlPlane.Agent",
    [switch]$RemoveLogs
)

$ErrorActionPreference = "Stop"

Write-Host "Uninstalling ControlPlane.Agent Windows Service..." -ForegroundColor Cyan

# Check if service exists
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "Service '$ServiceName' is not installed." -ForegroundColor Yellow
    exit 0
}

# Stop the service
Write-Host "Stopping service..." -ForegroundColor Gray
try {
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
} catch {
    Write-Warning "Could not stop service gracefully: $_"
}

# Delete the service
Write-Host "Removing service..." -ForegroundColor Gray
$result = sc.exe delete $ServiceName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to delete service: $result"
    exit 1
}

Write-Host "Service '$ServiceName' uninstalled." -ForegroundColor Green

# Optionally remove logs
if ($RemoveLogs) {
    $logDir = "C:\ProgramData\ControlPlane"
    if (Test-Path $logDir) {
        Write-Host "Removing log directory: $logDir" -ForegroundColor Gray
        Remove-Item -Path $logDir -Recurse -Force
        Write-Host "Log directory removed." -ForegroundColor Green
    }
}

Write-Host "`nUninstall complete." -ForegroundColor Green
