/**
 * x_puppeteer_setup.cjs — Setup interactivo para Puppeteer X (Twitter) Bot
 * 
 * Abre el navegador para inicio de sesión manual para saltar el Captcha/Verificación.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');
const { existsSync, mkdirSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const userDataDir = path.join(__dirname, '.puppeteer_x_profile');
if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
}

(async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🦖 Godzilla Consulting — Auto-Setup X Bot');
    console.log('═══════════════════════════════════════════════════');
    console.log('Abriendo navegador para iniciar sesión en X (Twitter)...');
    
    const browser = await puppeteer.launch({
        headless: false, // DEBE SER VISIBLE para resolver captchas si los pide
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
    
    console.log('Navegando a la página directa de Login de X...');
    await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });

    console.log('\n[!] ATENCIÓN: Tienes el control del navegador.');
    console.log('1. Ingresa tu número de celular o tu usuario (seggsxm) y dale a Siguiente.');
    console.log('2. Ingresa tu contraseña (123456789@).');
    console.log('3. Resuelve cualquier verificación si te la pide.');
    console.log('\n⏳ Tienes 5 MINUTOS para completar el proceso...\n');
    
    // Intento de auto-llenado si los datos están disponibles (muy propenso a fallar en X por seguridad)
    try {
        if (process.env.X_USERNAME && process.env.X_USERNAME !== 'tu_usuario_fake_aqui') {
            await page.waitForSelector('input[autocomplete="username"]', { timeout: 5000 });
            await page.type('input[autocomplete="username"]', process.env.X_USERNAME, { delay: 100 });
            console.log('🤖 Usuario inyectado automáticamente. Por favor continúa dándole a "Siguiente".');
        }
    } catch(e) {
        // Ignorar si no aparece el selector
    }

    // Esperar un tiempo largo (5 minutos) para que el usuario pueda crear la cuenta/iniciar sesión
    await new Promise(r => setTimeout(r, 300000));
    
    console.log('Guardando sesión y cerrando navegador...');
    await browser.close();
    
    console.log('✅ SETUP DE X COMPLETADO.');
    console.log('Las cookies han sido guardadas en la carpeta .puppeteer_x_profile');
    process.exit(0);
})().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
