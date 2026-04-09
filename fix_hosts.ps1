$file = 'C:\Windows\System32\drivers\etc\hosts'
$content = Get-Content $file | Where-Object { $_ -notmatch 'bot' }
Set-Content -Path $file -Value $content -Encoding ASCII
ipconfig /flushdns
