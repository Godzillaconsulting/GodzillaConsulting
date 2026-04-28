import { Client, LocalAuth } from 'whatsapp-web.js';
import path from 'path';
import os from 'os';

console.log("==========================================");
console.log("   VINCULACIÓN MANUAL DE WHATSAPP BOTS    ");
console.log("==========================================");
console.log("Abriendo Chrome visible para pasar la protección antibots...");

const sessionPath = 'C:\\Users\\GODZILLA.IA\\.godzilla-sessions\\whatsapp';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
        headless: false, // ¡VISIBLE PARA EVITAR BLOQUEO DE WHATSAPP!
        executablePath: CHROME_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('🤖 Escanea el código QR en la ventana de Chrome que se abrió.');
    console.log('======================================================');
});

client.on('authenticated', () => {
    console.log('\n✅ ¡Autenticación exitosa! La sesión ha sido guardada de forma segura.');
});

client.on('ready', () => {
    console.log('\n✅ ¡El bot está vinculado permanentemente!');
    console.log('Cerrando esta ventana en 5 segundos. Luego puedes iniciar el servicio maestro.');
    setTimeout(() => {
        process.exit(0);
    }, 5000);
});

client.initialize();
