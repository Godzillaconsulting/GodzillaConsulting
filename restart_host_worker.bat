@echo off
title Godzilla Consulting - Restart Host Worker
echo ==============================================
echo REINICIANDO TRABAJADOR AI-CORE EN EL HOST
echo ==============================================
echo.
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd restart ai-core --update-env
echo.
echo Proceso de reinicio completado.
timeout /t 3
