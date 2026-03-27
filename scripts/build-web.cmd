@echo off
setlocal
cd /d "%~dp0\.."
rem Bypass PowerShell execution policy by using npm.cmd via cmd.exe
npm.cmd run build
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo Build failed with exit code %EXITCODE%
)
exit /b %EXITCODE%
