@echo off
setlocal
cd /d "%~dp0\.."
rem Desktop build (Vite mode desktop)
npm.cmd run build:desktop
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo Desktop build failed with exit code %EXITCODE%
)
exit /b %EXITCODE%
