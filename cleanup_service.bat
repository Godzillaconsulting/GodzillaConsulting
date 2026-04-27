C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe stop GodzillaBackend
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe remove GodzillaBackend confirm
taskkill /F /IM node.exe
del /Q /F C:\Users\GODZILLA.IA\.pm2\rpc.sock
del /Q /F C:\Users\GODZILLA.IA\.pm2\pub.sock
