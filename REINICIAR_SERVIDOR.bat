@echo off
:: ============================================================
::  REINICIAR_SERVIDOR.bat
::  ACTUALIZADO: Ya NO hace "taskkill node.exe" (mataba TODO)
::  Ahora solo reinicia godzilla-server via PM2 quirurgicamente.
::  Para reiniciar CUALQUIER proceso especifico -> GESTOR_REINICIO.bat
:: ============================================================
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B
)

:gotAdmin
if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
pushd "%CD%"
CD /D "%~dp0"

title GODZILLA - Reiniciando Servidor API...
color 0E

echo.
echo  ==========================================
echo   GODZILLA - Reinicio SOLO godzilla-server
echo   (WhatsApp Bot y demas = INTACTOS)
echo  ==========================================
echo.

set PM2_HOME=C:\Users\GODZILLA.IA\.pm2

echo  [1/3] Reiniciando godzilla-server via PM2...
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart godzilla-server --update-env

echo.
echo  [2/3] Esperando 5s para que el servidor levante...
timeout /t 5 /nobreak >nul

echo  [3/3] Estado:
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd list

echo.
echo  ==========================================
echo   LISTO. Para reiniciar CUALQUIER proceso:
echo   -> Ejecuta GESTOR_REINICIO.bat
echo  ==========================================
echo.
pause
