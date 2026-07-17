@echo off
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2_godzilla
cd C:\Users\GODZILLA.IA\GodzillaConsulting
call C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd start ecosystem.config.cjs --no-daemon
