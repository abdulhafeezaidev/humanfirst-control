@echo off
title HumanFirst Control - Desktop Launcher
echo ============================================
echo   HumanFirst Control - Desktop Launcher
echo ============================================
echo.

:: Change to the project directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Node.js found: 
node --version

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully.
) else (
    echo [INFO] Dependencies already installed.
)

:: Ensure port 8080 is free so Vite and Electron stay on the same URL
tasklist /FI "MEMUSAGE gt 0" > nul
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":8080 "') do (
    taskkill /PID %%A /F >nul 2>&1
)

:: Start the ControlPlane.Agent if it's not already running
echo.
echo [INFO] Ensuring ControlPlane.Agent is running...
tasklist /FI "IMAGENAME eq ControlPlane.Agent.exe" 2>nul | find /I "ControlPlane.Agent.exe" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Starting ControlPlane.Agent...
    set "AGENT_PATH=%cd%\agent\ControlPlane.Agent\publish\ControlPlane.Agent.exe"
    if exist "%AGENT_PATH%" (
        start "" "%AGENT_PATH%"
        echo [INFO] ControlPlane.Agent started. Waiting for initialization...
        timeout /T 3 /NOBREAK
    ) else (
        echo [WARN] ControlPlane.Agent.exe not found at !AGENT_PATH!
        echo [WARN] Agent pipe will not be available until manually started.
    )
) else (
    echo [INFO] ControlPlane.Agent already running.
)

echo.
echo [INFO] Launching HumanFirst Control as desktop app...
echo [INFO] The app window will open shortly...
echo.

:: Launch the Electron desktop app
call npm run desktop:dev

pause
