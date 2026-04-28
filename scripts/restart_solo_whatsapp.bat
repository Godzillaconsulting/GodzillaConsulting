@echo off
:: ============================================================
::  GODZILLA - REINICIAR SOLO WhatsApp Bot (SIN tocar el resto)
::  - NO detiene el servicio GodzillaBackend
::  - NO afecta al godzilla-server, email-worker, ai-core, etc.
::  - Solo reinicia el proceso PM2 "whatsapp-bot"
::  Doble clic -> auto-eleva a Admin -> reinicia SOLO WP
:: ============================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title GODZILLA - Reiniciando SOLO WhatsApp Bot...
color 0B

echo.
echo  ==========================================
echo   GODZILLA - Reinicio QUIRURGICO WhatsApp
echo   (godzilla-server y demas = INTACTOS)
echo  ==========================================
echo.

:: Matar Chrome zombie del WP bot (solo chrome, no node)
echo  [1/4] Limpiando Chrome zombie del bot anterior...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

:: Reiniciar SOLO whatsapp-bot via PM2 con el PM2_HOME correcto
echo  [2/4] Reiniciando proceso PM2 "whatsapp-bot"...
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart whatsapp-bot --update-env

echo.
echo  [3/4] Esperando 20s para que Chrome y WWebJS carguen...
timeout /t 20 /nobreak >nul

echo.
echo  [4/4] Estado actual de PM2:
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd list

echo.
echo  === ULTIMAS LINEAS DEL BOT ===
powershell -Command "Get-Content -Tail 10 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"

echo.
echo  ==========================================
echo   Si ves "ZillaBot conectado" = EXITOSO
echo   Si necesita QR -> http://localhost:3002/qr
echo   El resto de bots y servidor = SIN CAMBIOS
echo  ==========================================
echo.
pause
