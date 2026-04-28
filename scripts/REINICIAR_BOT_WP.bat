@echo off
:: ============================================================
::  GODZILLA - REINICIAR BOT WHATSAPP (Doble Clic)
::  Se auto-eleva a Administrador. Sin necesitar terminal.
:: ============================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title GODZILLA - Reiniciando WhatsApp Bot...
color 0A

echo.
echo  ==========================================
echo   GODZILLA - Reinicio WhatsApp Bot 24/7
echo  ==========================================
echo.
echo  [1/4] Deteniendo servicio GodzillaBackend...
sc stop GodzillaBackend >nul 2>&1
timeout /t 5 /nobreak >nul

echo  [2/4] Matando procesos Chrome zombie...
taskkill /F /IM chrome.exe /T >nul 2>&1

echo  [3/4] Iniciando servicio GodzillaBackend...
sc start GodzillaBackend >nul 2>&1
timeout /t 8 /nobreak >nul

echo  [4/4] Verificando estado...
sc query GodzillaBackend | findstr "STATE"

echo.
echo  Esperando 25s para que Chrome cargue el QR...
timeout /t 25 /nobreak >nul

echo.
echo  === ULTIMAS LINEAS DEL BOT DE WHATSAPP ===
powershell -Command "Get-Content -Tail 8 'C:\Users\GODZILLA.IA\.pm2\logs\whatsapp-bot-out.log'"

echo.
echo  ==========================================
echo   Si ves "ZillaBot conectado" = EXITOSO
echo   Si ves QR en consola = Escanea en:
echo   http://localhost:3002/qr
echo  ==========================================
echo.
pause
