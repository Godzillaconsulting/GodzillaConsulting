@echo off
:: ============================================================
::  GODZILLA - REINICIAR SOLO godzilla-server (API Backend)
::  NO afecta WhatsApp Bot, email-worker ni ai-core.
:: ============================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title GODZILLA - Reiniciando SOLO godzilla-server...
color 0E

echo.
echo  ==========================================
echo   GODZILLA - Reinicio QUIRURGICO Servidor
echo   (bots y workers = INTACTOS)
echo  ==========================================
echo.

set PM2_HOME=C:\Users\GODZILLA.IA\.pm2

echo  [1/3] Reiniciando proceso PM2 "godzilla-server"...
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart godzilla-server --update-env

echo.
echo  [2/3] Esperando 5s para que el servidor levante...
timeout /t 5 /nobreak >nul

echo.
echo  [3/3] Estado actual de PM2:
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd list

echo.
echo  === ULTIMAS LINEAS DEL SERVIDOR ===
powershell -Command "Get-Content -Tail 8 'C:\Users\GODZILLA.IA\.pm2\logs\godzilla-server-out.log'"

echo.
echo  ==========================================
echo   Servidor API reiniciado. WP Bot = OK
echo  ==========================================
echo.
pause
