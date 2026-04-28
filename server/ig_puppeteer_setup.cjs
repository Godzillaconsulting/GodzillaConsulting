/**
 * ig_puppeteer_setup.cjs — Setup interactivo para Puppeteer IG Bot
 * 
 * Abre el navegador para inicio de sesión manual para saltar el Checkpoint.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');
const { existsSync, mkdirSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const userDataDir = path.join(__dirname, '.puppeteer_ig_profile');
if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
}

(async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🦖 Godzilla Consulting — Auto-Setup IG Bot');
    console.log('═══════════════════════════════════════════════════');
    console.log('Abriendo navegador para auto-login...');
    
    const browser = await puppeteer.launch({
        headless: 'old', // Puede correr invisible ahora porque es automático
        userDataDir: userDataDir,
        args: [
            '--window-size=1200,800', 
            '--disable-notifications',
            '--disable-infobars',
            '--no-sandbox'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('Navegando a la bandeja de entrada de Instagram...');
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    console.log('Iniciando sesión automáticamente con las credenciales de .env...');
    try {
        await page.waitForSelector('input[name="username"]', { timeout: 8000 });
        await page.type('input[name="username"]', process.env.IG_USERNAME, { delay: 100 });
        await page.type('input[name="password"]', process.env.IG_PASSWORD, { delay: 100 });
        await page.click('button[type="submit"]');
        
        console.log('Esperando a que cargue la bandeja...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('✅ ¡Inicio de sesión automático exitoso!');
    } catch(e) {
        console.log('✅ Sesión ya estaba activa o se saltó el login.');
    }
    
    console.log('Guardando sesión y cerrando navegador...');
    await browser.close();
    
    console.log('✅ SETUP COMPLETADO AUTOMÁTICAMENTE.');
    process.exit(0);
})().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
