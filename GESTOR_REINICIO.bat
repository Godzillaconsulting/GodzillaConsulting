@echo off
:: ============================================================
::  GODZILLA - GESTOR MAESTRO DE REINICIO GRANULAR
::  Elige QUE reiniciar sin tumbar el resto del stack.
::
::  Procesos disponibles:
::    1. whatsapp-bot
::    2. godzilla-server
::    3. email-worker
::    4. ai-core
::    5. trends-bot
::    6. tiktok-bot
::    7. instagram-bot
::    8. TODOS (full restart del servicio - usa solo si es necesario)
:: ============================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title GODZILLA - Gestor de Reinicio Granular
color 0A

:MENU
cls
echo.
echo  ============================================
echo   GODZILLA - REINICIO GRANULAR DE PROCESOS
echo  ============================================
echo.
echo   Elige que proceso reiniciar:
echo.
echo   [1] WhatsApp Bot         (whatsapp-bot)
echo   [2] Servidor API         (godzilla-server)
echo   [3] Email Worker         (email-worker)
echo   [4] AI Core              (ai-core)
echo   [5] Trends Bot           (trends-bot)
echo   [6] TikTok Bot           (tiktok-bot)
echo   [7] Instagram Bot        (instagram-bot)
echo   [8] Ver estado PM2       (sin reiniciar nada)
echo   [9] REINICIO TOTAL       (servicio completo - TODOS se caen)
echo   [10] LIMPIEZA ZOMBIE     (mata todo Node/Chrome atascado)
echo   [0] Salir
echo.
set /p OPCION="  Tu eleccion: "

if "%OPCION%"=="1" goto RESTART_WP
if "%OPCION%"=="2" goto RESTART_SERVER
if "%OPCION%"=="3" goto RESTART_EMAIL
if "%OPCION%"=="4" goto RESTART_AICORE
if "%OPCION%"=="5" goto RESTART_TRENDS
if "%OPCION%"=="6" goto RESTART_TIKTOK
if "%OPCION%"=="7" goto RESTART_IG
if "%OPCION%"=="8" goto STATUS
if "%OPCION%"=="9" goto RESTART_TOTAL
if "%OPCION%"=="10" goto LIMPIEZA_ZOMBIE
if "%OPCION%"=="0" exit /b
goto MENU

:: ---- Variables comunes ----
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
set PM2_CMD=C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd

:RESTART_WP
cls
echo.
echo  Reiniciando SOLO whatsapp-bot...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
taskkill /F /IM chrome.exe /T >nul 2>&1
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart whatsapp-bot --update-env
echo  Esperando 20s para que Chrome cargue...
timeout /t 20 /nobreak >nul
powershell -Command "Get-Content -Tail 8 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"
echo.
echo  Si necesita QR: http://localhost:3002/qr
echo.
pause
goto MENU

:RESTART_SERVER
cls
echo.
echo  Reiniciando SOLO godzilla-server...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart godzilla-server --update-env
timeout /t 5 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\godzilla-server-out.log'"
echo.
pause
goto MENU

:RESTART_EMAIL
cls
echo.
echo  Reiniciando SOLO email-worker...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart email-worker --update-env
timeout /t 3 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\email-worker-out.log'"
echo.
pause
goto MENU

:RESTART_AICORE
cls
echo.
echo  Reiniciando SOLO ai-core...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart ai-core --update-env
timeout /t 5 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\ai-core-out.log'"
echo.
pause
goto MENU

:RESTART_TRENDS
cls
echo.
echo  Reiniciando SOLO trends-bot...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart trends-bot --update-env
timeout /t 3 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\trends-bot-out.log'"
echo.
pause
goto MENU

:RESTART_TIKTOK
cls
echo.
echo  Reiniciando SOLO tiktok-bot...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
taskkill /F /IM chrome.exe /T >nul 2>&1
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart tiktok-bot --update-env
echo  Esperando 10s para que TikTok cargue...
timeout /t 10 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\tiktok-bot-out.log'"
echo.
pause
goto MENU

:RESTART_IG
cls
echo.
echo  Reiniciando SOLO instagram-bot...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
taskkill /F /IM chrome.exe /T >nul 2>&1
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart instagram-bot --update-env
echo  Esperando 10s para que IG cargue...
timeout /t 10 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\instagram-bot-out.log'"
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  === ESTADO ACTUAL DE TODOS LOS PROCESOS PM2 ===
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd list
echo.
pause
goto MENU

:RESTART_TOTAL
cls
echo.
echo  ADVERTENCIA: Esto detendra TODOS los procesos.
echo  Presiona ENTER para confirmar o cierra esta ventana para cancelar.
pause
echo.
echo  Deteniendo servicio GodzillaBackend...
sc stop GodzillaBackend
timeout /t 5 /nobreak >nul
echo  Iniciando servicio GodzillaBackend...
sc start GodzillaBackend
timeout /t 10 /nobreak >nul
sc query GodzillaBackend | findstr "STATE"
echo.
pause
goto MENU

:LIMPIEZA_ZOMBIE
cls
echo.
echo  ==========================================
echo   GODZILLA - LIMPIEZA DE EMERGENCIA
echo  ==========================================
echo.
echo  [1/4] Deteniendo servicio GodzillaBackend...
net stop GodzillaBackend
timeout /t 3 /nobreak >nul

echo  [2/4] Matando procesos Node.exe (zombies)...
taskkill /F /IM node.exe /T

echo  [3/4] Matando procesos Chrome.exe (zombies)...
taskkill /F /IM chrome.exe /T

echo  [4/4] Limpiando sockets de PM2...
del /Q /F "C:\Users\GODZILLA.IA\.pm2\*.sock" 2>nul
timeout /t 3 /nobreak >nul

echo.
echo  Iniciando servicio GodzillaBackend de forma limpia...
net start GodzillaBackend
echo.
echo  [!] Listo. Si tenias sesion pendiente de WhatsApp, escanea en http://localhost:3002/qr
echo.
pause
goto MENU
