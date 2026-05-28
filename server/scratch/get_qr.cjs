const fs = require('fs');
const log = fs.readFileSync('C:\\Users\\GODZILLA.IA\\.pm2\\logs\\whatsapp-bot-out.log', 'utf8');
const match = log.match(/RAW_QR_STRING_IS:(.*)/g);
if (match) {
    const last = match[match.length - 1].replace('RAW_QR_STRING_IS:', '').trim();
    const html = `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#222;font-family:sans-serif;color:white;">
        <h2>Escanea el QR de WhatsApp</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(last)}" style="padding:20px;background:white;border-radius:10px;">
    </div>`;
    fs.writeFileSync('C:\\Users\\GODZILLA.IA\\Desktop\\ESCANEAR_QR.html', html);
    console.log('OK');
} else {
    console.log('NO_MATCH');
}
