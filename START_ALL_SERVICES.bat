@echo off
title TerraWave AI - Smart Irrigation System Launcher
color 0A

echo.
echo  =========================================================
echo   TERRAWAVE AI - SMART IRRIGATION SYSTEM
echo   Starting all services...
echo  =========================================================
echo.

REM Check if MongoDB is running
sc query MongoDB 2>nul | findstr "RUNNING" >nul
if errorlevel 1 (
    echo [INFO] Starting MongoDB service...
    net start MongoDB 2>nul
    if errorlevel 1 (
        echo [WARN] Could not start MongoDB as service. Trying mongod directly...
        start /min "MongoDB" mongod --dbpath "C:\data\db" 2>nul
    )
) else (
    echo [OK] MongoDB is already running.
)

echo [INFO] Starting Python ML Service (Port 8000)...
start "TerraWave ML Service" cmd /k "cd /d %~dp0ml-service && python main.py"

echo [INFO] Waiting for ML Service to initialize...
timeout /t 5 /nobreak >nul

echo [INFO] Starting Node.js Backend (Port 1607)...
start "TerraWave Backend" cmd /k "cd /d %~dp0backend && node server.js"

echo [INFO] Waiting for Backend to connect to MongoDB...
timeout /t 3 /nobreak >nul

echo [INFO] Starting React Frontend Dev Server (Port 1606)...
start "TerraWave Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [INFO] Waiting for Frontend to compile...
timeout /t 5 /nobreak >nul

echo.
echo  =========================================================
echo   ALL SERVICES LAUNCHED SUCCESSFULLY!
echo.
echo   Frontend:   http://localhost:1606
echo   Backend:    http://localhost:1607
echo   ML Service: http://localhost:8000
echo   MongoDB:    mongodb://localhost:27017/terrawave
echo  =========================================================
echo.
echo  Press any key to open the app in your browser...
pause >nul
start http://localhost:1606
