@echo off
:: ============================================================
:: restart_godzilla_service.bat
:: Reinicia el Servicio de Windows GodzillaBackend (que gestiona PM2 + todos los bots).
:: Solo hacer DOBLE CLIC — se eleva solo a Administrador.
:: ============================================================

:: --- Auto-elevación si no somos Admin ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs -Wait"
    exit /b
)

echo.
echo ============================================================
echo   GODZILLA CONSULTING - Reinicio Servicio GodzillaBackend
echo   (PM2 + WhatsApp Bot + Todos los procesos)
echo ============================================================
echo.

echo [1/4] Deteniendo servicio GodzillaBackend...
net stop GodzillaBackend
timeout /t 3 /nobreak >nul

echo.
echo [2/4] Iniciando servicio GodzillaBackend...
net start GodzillaBackend
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Verificando estado del servicio...
sc query GodzillaBackend | find "STATE"

echo.
echo [4/4] Revisando log de arranque del WhatsApp Bot (ultimas 10 lineas)...
timeout /t 8 /nobreak >nul
powershell -Command "Get-Content -Tail 10 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"

echo.
echo ============================================================
echo   LISTO. El servicio fue reiniciado.
echo   Si el bot de WhatsApp necesita QR, abre:
echo   http://localhost:3002/qr
echo ============================================================
echo.
pause
