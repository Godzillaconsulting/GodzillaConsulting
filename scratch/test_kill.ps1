Start-Transcript -Path "C:\Users\GODZILLA.IA\GodzillaConsulting\scratch\kill_log.txt"
Write-Output "Stopping GodzillaBackend..."
Stop-Service GodzillaBackend -Force -ErrorAction Continue
Write-Output "Stopping cloudflared..."
Stop-Service cloudflared -Force -ErrorAction Continue
Write-Output "Killing node.exe..."
Stop-Process -Name node -Force -ErrorAction Continue
taskkill /F /IM node.exe
Write-Output "Killing cloudflared.exe..."
taskkill /F /IM cloudflared.exe
Write-Output "Starting GodzillaBackend..."
Start-Service GodzillaBackend -ErrorAction Continue
Write-Output "Starting cloudflared..."
Start-Service cloudflared -ErrorAction Continue
Stop-Transcript
