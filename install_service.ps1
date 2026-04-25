# Stop PM2 from current session
C:\Users\GODZILLA.IA\AppData\Roaming\npm\pm2.cmd kill

# Remove existing service if any
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe stop GodzillaBackend
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe remove GodzillaBackend confirm

# Install new service
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe install GodzillaBackend "C:\Users\GODZILLA.IA\GodzillaConsulting\start_godzilla_service.bat"
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe set GodzillaBackend AppDirectory "C:\Users\GODZILLA.IA\GodzillaConsulting"
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe set GodzillaBackend DisplayName "Godzilla Autonomous Backend"
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe set GodzillaBackend Description "Runs the PM2 Godzilla Node Backend autonomously 24/7"

# Start the service
C:\Users\GODZILLA.IA\GodzillaConsulting\nssm.exe start GodzillaBackend

# Restart cloudflared to ensure it binds correctly to the newly started Node process
Restart-Service cloudflared -Force
