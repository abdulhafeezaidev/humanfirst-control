#!/usr/bin/env pwsh

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [string]$Root = $null,
  [int]$KeepLatestDist = 1,
  [int]$KeepLatestPackage = 1,
  [switch]$NoConfirm,
  [int]$MaxAttempts = 8,
  [int]$LockedMaxAttempts = 2,
  [int]$RetryDelaySeconds = 3,
  [string[]]$Keep = @(
    'builder-debug.yml',
    'builder-effective-config.yaml',
    'latest.yml'
  )
)

if ($NoConfirm) {
  $ConfirmPreference = 'None'
}

if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = Join-Path $PSScriptRoot '..\desktop\dist'
}

try {
  $Root = (Resolve-Path -LiteralPath $Root -ErrorAction Stop).Path
} catch {
  Write-Error "Cleanup root does not exist: $Root"
  exit 1
}

Write-Host "Cleanup root: $Root"

$items = Get-ChildItem -LiteralPath $Root -ErrorAction Stop

$dirs = $items | Where-Object { $_.PSIsContainer }
$files = $items | Where-Object { -not $_.PSIsContainer }

$keepDirs = @()

if ($KeepLatestDist -gt 0) {
  $keepDirs += ($dirs |
      Where-Object { $_.Name -like 'dist-*' } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First $KeepLatestDist)
}

if ($KeepLatestPackage -gt 0) {
  $keepDirs += ($dirs |
      Where-Object { $_.Name -like 'package-*' } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First $KeepLatestPackage)
}

$keepDirNames = $keepDirs | ForEach-Object { $_.Name }

Write-Host "Keeping files: $($Keep -join ', ')"
Write-Host "Keeping folders: $($keepDirNames -join ', ')"
Write-Host "Tip: run with -WhatIf first to preview deletions."

function Test-IsLockError {
  param(
    [Parameter(Mandatory = $true)]
    [System.Exception]$Exception
  )

  $message = $Exception.Message
  if ($null -eq $message) { $message = '' }
  $message = $message.ToLowerInvariant()
  if ($message -like '*being used by another process*') { return $true }
  if ($message -like '*used by another process*') { return $true }
  return $false
}

foreach ($item in $items) {
  if (-not $item.PSIsContainer -and ($Keep -contains $item.Name)) {
    Write-Host "Keeping" $item.FullName
    continue
  }

  if ($item.PSIsContainer -and ($keepDirNames -contains $item.Name)) {
    Write-Host "Keeping" $item.FullName
    continue
  }

  $ok = $false
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      if (-not $PSCmdlet.ShouldProcess($item.FullName, 'Delete')) {
        $ok = $true
        break
      }

      Write-Host "Deleting (attempt $i/$MaxAttempts)" $item.FullName
      Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction Stop
      $ok = $true
      break
    } catch {
      Write-Host "  Failed:" $_.Exception.Message

      $isLocked = Test-IsLockError -Exception $_.Exception
      if ($isLocked -and $i -ge $LockedMaxAttempts) {
        Write-Host "  Looks locked; skipping after $i attempt(s)."
        break
      }

      if ($RetryDelaySeconds -gt 0) {
        Start-Sleep -Seconds $RetryDelaySeconds
      }
    }
  }

  if (-not $ok) {
    Write-Host "SKIPPED (still locked):" $item.FullName
    Write-Host "Tip: close the app, close File Explorer windows showing this folder, then retry. If it still fails, reboot and run this script again."
  }
}
