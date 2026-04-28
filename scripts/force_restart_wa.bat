@echo off
:: ============================================================
:: force_restart_wa.bat
:: Usa PsExec o NSSM para reiniciar el whatsapp-bot dentro
:: del contexto SYSTEM donde corre PM2.
:: Solo hacer DOBLE CLIC.
:: ============================================================

:: Auto-elevación a Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs -Wait"
    exit /b
)

echo.
echo ============================================================
echo   GODZILLA - Force Restart WhatsApp Bot (via SYSTEM context)
echo ============================================================
echo.

:: Método 1: Reiniciar el servicio completo GodzillaBackend
:: Esto garantiza que PM2 relance todos los procesos con el código nuevo.
echo [1/3] Deteniendo GodzillaBackend Service...
sc stop GodzillaBackend
timeout /t 6 /nobreak >nul

echo [2/3] Iniciando GodzillaBackend Service...
sc start GodzillaBackend
timeout /t 10 /nobreak >nul

echo [3/3] Verificando estado...
sc query GodzillaBackend | findstr "STATE"

echo.
echo Revisando arranque del bot (espera 15s para que Chrome cargue)...
timeout /t 15 /nobreak >nul
powershell -Command "Get-Content -Tail 15 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"

echo.
echo Si ves "ZillaBot conectado y listo" arriba = EXITO
echo Si ves "Cerrando Chrome" todavia = revisar error log:
echo    C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-error.log
echo.
pause
