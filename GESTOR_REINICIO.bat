@echo off
cd /d C:\Users\GODZILLA.IA\GodzillaConsulting
title GESTOR MAESTRO - GodzillaConsultingIO GRANULAR
:: ============================================================
::  GODZILLA - GESTOR MAESTRO DE REINICIO GRANULAR
::  Elige QUE reiniciar sin tumbar el resto del stack.
:: ============================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: FIX THE CURRENT DIRECTORY WHEN RUN AS ADMIN
cd /d "%~dp0"

title GODZILLA - Gestor de Reinicio Granular
color 0A

:: ---- Variables comunes ----
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla
set PM2_CMD="C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd"

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
echo   [2] Servidor API + Worker (godzilla-server)
echo   [3] Email Worker         (email-worker)
echo   [4] Trends Bot           (trends-bot)
echo   [5] Newsletter Bot       (newsletter-bot)
echo   [9] Ver estado PM2       (sin reiniciar nada)
echo   [10] REINICIO TOTAL      (todos los procesos)
echo   [11] LIMPIEZA ZOMBIE     (mata todo Node/Chrome atascado)
echo   [12] Auto-Renovar IG     (inicia sesion automaticamente)
echo   [13] REPARAR WHATSAPP    (borra sesion corrupta - usa solo si hay bucle)
echo   [0] Salir
echo.
set /p OPCION="  Tu eleccion: "

if "%OPCION%"=="1" goto RESTART_WP
if "%OPCION%"=="2" goto RESTART_SERVER
if "%OPCION%"=="3" goto RESTART_EMAIL
if "%OPCION%"=="4" goto RESTART_TRENDS
if "%OPCION%"=="5" goto RESTART_NEWSLETTER
if "%OPCION%"=="9" goto STATUS
if "%OPCION%"=="10" goto RESTART_TOTAL
if "%OPCION%"=="11" goto LIMPIEZA_ZOMBIE
if "%OPCION%"=="12" goto RENOVAR_IG
if "%OPCION%"=="13" goto REPARAR_WP
if "%OPCION%"=="0" exit /b
goto MENU



:RESTART_WP
cls
echo.
echo  Reiniciando SOLO whatsapp-bot...
call %PM2_CMD% restart whatsapp-bot --update-env
echo  Esperando 20s para que Chrome cargue...
timeout /t 20 /nobreak >nul
powershell -Command "Get-Content -Tail 45 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"
echo.
echo  Si necesita QR: http://localhost:4010/qr
echo.
pause
goto MENU

:RESTART_SERVER
cls
echo.
echo  [1/3] Liberando el puerto 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
    echo  Matando PID %%a...
    taskkill /PID %%a /F
)
timeout /t 3 /nobreak >nul

echo  [1.5/3] Eliminando ai-core duplicado si existe...
start "PM2 Delete ai-core" /wait cmd /c "set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla && %PM2_CMD% delete ai-core 2>nul"
timeout /t 2 /nobreak >nul

echo  [2/3] Reiniciando godzilla-server via PM2 (sesion de usuario)...
start "PM2 Restart" /wait cmd /c "set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla && %PM2_CMD% stop godzilla-server && timeout /t 3 /nobreak && %PM2_CMD% start godzilla-server --update-env"
timeout /t 10 /nobreak >nul

echo  [3/3] Reseteando tareas en error...
node -e "import('pg').then(({Pool})=>{const p=new Pool({user:'postgres',host:'localhost',database:'godzilla',password:'godzilla2026',port:5432});p.query(\"UPDATE studio_tasks SET status='pending_render' WHERE status IN ('failed_docker','rendering_docker')\").then(r=>{console.log('Tareas reseteadas:',r.rowCount);p.end();})})"
echo.
powershell -Command "Get-Content -Tail 10 'C:\Users\GODZILLA.IA\.pm2_godzilla\logs\godzilla-server-out.log'"
echo.
pause
goto MENU

:RESTART_EMAIL
cls
echo.
echo  Reiniciando SOLO email-worker...
call %PM2_CMD% restart email-worker --update-env
timeout /t 3 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2\logs\email-worker-out.log'"
echo.
pause
goto MENU

:RESTART_TRENDS
cls
echo.
echo  Reiniciando SOLO trends-bot...
call %PM2_CMD% restart trends-bot --update-env
timeout /t 3 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2_godzilla\logs\trends-bot-out.log'"
echo.
pause
goto MENU

:RESTART_NEWSLETTER
cls
echo.
echo  Reiniciando SOLO newsletter-bot...
call %PM2_CMD% restart newsletter-bot --update-env
timeout /t 3 /nobreak >nul
powershell -Command "Get-Content -Tail 5 'C:\Users\GODZILLA.IA\.pm2_godzilla\logs\newsletter-bot-out.log'"
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  === ESTADO ACTUAL DE TODOS LOS PROCESOS PM2 ===
call %PM2_CMD% list
echo.
pause
goto MENU

:RESTART_TOTAL
cls
echo.
echo  ADVERTENCIA: Esto detendra TODOS los procesos PM2 y los reiniciara.
echo  Presiona ENTER para confirmar o cierra esta ventana para cancelar.
pause
echo.
echo  [1/4] Asesinando TODOS los procesos Node zombies a la fuerza...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo  [2/4] Verificando puerto 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
    echo  Matando PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo  [3/4] Reiniciando todos los procesos PM2...
start "PM2 Restart All" /wait cmd /c "set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla && %PM2_CMD% start ecosystem.config.cjs --update-env"
timeout /t 8 /nobreak >nul

echo  [4/4] Reseteando tareas en error...
node -e "import('pg').then(({Pool})=>{const p=new Pool({user:'postgres',host:'localhost',database:'godzilla',password:'godzilla2026',port:5432});p.query(\"UPDATE studio_tasks SET status='pending_render' WHERE status IN ('failed_docker','rendering_docker')\").then(r=>{console.log('Tareas reseteadas:',r.rowCount);p.end();})})"
echo.
call %PM2_CMD% list
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
echo  [1/3] Liberando puerto 3000 y matando zombies...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do (
    echo  Matando PID %%a...
    taskkill /PID %%a /F
)
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

echo  [2/3] Limpiando candados de sesion...
if exist "C:\Users\GODZILLA.IA\.godzilla-sessions\whatsapp\session\lockfile" del /F /Q "C:\Users\GODZILLA.IA\.godzilla-sessions\whatsapp\session\lockfile" 2>nul
if exist "C:\Users\GODZILLA.IA\.godzilla-sessions\whatsapp\session\SingletonLock" del /F /Q "C:\Users\GODZILLA.IA\.godzilla-sessions\whatsapp\session\SingletonLock" 2>nul
timeout /t 2 /nobreak >nul

echo  [3/3] Reiniciando godzilla-server limpio...
start "PM2 Restart" /wait cmd /c "set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla && %PM2_CMD% restart godzilla-server --update-env"
timeout /t 8 /nobreak >nul
powershell -Command "Get-Content -Tail 8 'C:\Users\GODZILLA.IA\.pm2_godzilla\logs\godzilla-server-out.log'"
echo.
echo  [!] Limpieza completa.
echo.
pause
goto MENU

:RENOVAR_IG
cls
echo.
echo  =======================================================
echo    Iniciando Auto-Login Invisible de Instagram...
echo  =======================================================
echo.
echo  Matando cualquier navegador atascado por si acaso...
taskkill /F /IM chrome.exe /T >nul 2>&1

echo  Iniciando proceso de login (esto toma unos 15 segundos)...
node server/ig_puppeteer_setup.cjs

echo.
echo  =======================================================
echo    LISTO. La sesion ha sido renovada exitosamente!
echo    El bot maestro tomara el control en unos segundos.
echo  =======================================================
pause
goto MENU

:REPARAR_WP
cls
color 4F
echo.
echo ========================================================
echo   LIMPIEZA EXTREMA DE SESION CORRUPTA DE WHATSAPP
echo ========================================================
echo.
echo [1/2] Deteniendo el bot...
call %PM2_CMD% stop whatsapp-bot

echo [2/2] Borrando carpeta de sesion de Baileys...
rmdir /S /Q "C:\Users\GODZILLA.IA\.godzilla-sessions\baileys"

echo [Listo] Arrancando bot fresco...
call %PM2_CMD% restart whatsapp-bot --update-env

echo.
echo ========================================================
echo PROCESO COMPLETADO. 
echo Ahora ve a http://localhost:4010/qr , escanealo por ultima vez
echo y mandale el mensaje de prueba.
echo ========================================================
pause
color 0A
goto MENU


