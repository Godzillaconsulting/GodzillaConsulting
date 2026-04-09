import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_DATA_DIR = path.join(__dirname, 'session_data');

puppeteer.use(StealthPlugin());

console.log('🚀 Iniciando proceso de Setup para IG Neurona...');
console.log('📌 Por favor, inicia sesión manualmente. Si te pide 2FA, resuélvelo.');
console.log(`📁 Los datos de sesión se guardarán en: ${USER_DATA_DIR}`);

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false, // ¡Ventana visible para el login manual!
            userDataDir: USER_DATA_DIR,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

        console.log('----------------------------------------------------');
        console.log('⏳ Esperando a que inicies sesión y cargues el feed...');
        console.log('✅ Una vez que veas el feed principal y hayas pasado todo el 2FA/Captchas, cierra la ventana del navegador.');
        console.log('----------------------------------------------------');

        // Espera a que el navegador sea cerrado por el usuario (o desconectado)
        await new Promise(resolve => {
            browser.on('disconnected', resolve);
        });

        console.log('🔒 Navegador cerrado. La sesión ha sido guardada permanentemente.');
        console.log('👉 Ahora puedes iniciar el bot headless con: npm start');
        
    } catch (error) {
        console.error('❌ Error durante el setup:', error);
    }
})();
