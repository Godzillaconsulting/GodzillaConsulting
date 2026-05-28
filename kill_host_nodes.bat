@echo off
title Godzilla Consulting - Force Terminate Node Host Processes
echo ==============================================
echo FORZANDO CIERRE DE PROCESOS NODE EN EL HOST
echo ==============================================
echo.
taskkill /F /IM node.exe /T
echo.
echo Proceso completado.
timeout /t 3
