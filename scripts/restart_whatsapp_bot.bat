@echo off
:: ============================================================
:: restart_whatsapp_bot.bat
:: Reinicia el whatsapp-bot de PM2 con permisos de Administrador.
:: Doble clic -> Se auto-eleva -> Reinicia el bot -> Listo.
:: ============================================================

:: --- Auto-elevación si no somos Admin ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo.
echo ============================================================
echo   GODZILLA CONSULTING - Reinicio WhatsApp Bot
echo ============================================================
echo.

:: Reiniciar el bot via PM2 (bajo el contexto del servicio SYSTEM)
:: Usamos el mismo pm2 global que usa el servicio de Windows
echo [1/3] Reiniciando whatsapp-bot via PM2...
npx pm2 restart whatsapp-bot --update-env

echo.
echo [2/3] Esperando 5 segundos para que arranque Chrome...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Estado actual de PM2:
npx pm2 list

echo.
echo ============================================================
echo   LISTO. Revisa los logs en:
echo   C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log
echo ============================================================
echo.
pause
