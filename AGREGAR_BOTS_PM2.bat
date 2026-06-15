@echo off  
set PM2_HOME=C:\Users\GODZILLA.IA\.pm2  
set PM2_CMD=\" "C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd\  
call %%PM2_CMD%% start server/tiktok_bot.cjs --name tiktok-bot  
call %%PM2_CMD%% stop tiktok-bot  
call %%PM2_CMD%% start server/instagram_bot.cjs --name instagram-bot  
call %%PM2_CMD%% stop instagram-bot  
call %%PM2_CMD%% save  
call %%PM2_CMD%% list  
pause 
