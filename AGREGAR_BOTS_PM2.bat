@echo off
cd /d "%~dp0"
title GODZILLA - Agregando Bots a PM2
color 0A
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2
set PM2_CMD="C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd"

echo Agregando TikTok Bot...
call %PM2_CMD% start server/tiktok_bot.cjs --name tiktok-bot
call %PM2_CMD% stop tiktok-bot

echo.
echo Agregando Instagram Bot...
call %PM2_CMD% start server/instagram_bot.cjs --name instagram-bot
call %PM2_CMD% stop instagram-bot

echo.
echo Guardando configuracion...
call %PM2_CMD% save

echo.
echo === LISTO ===
call %PM2_CMD% list
pause
