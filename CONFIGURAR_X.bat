@echo off
cd /d "%~dp0"
title GODZILLA - Configurar Sesion de X (Twitter)
color 0A
echo.
echo Iniciando setup de Puppeteer para X...
node server/x_puppeteer_setup.cjs
pause
