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

const userDataDir = path.join(__dirname, '.puppeteer_ig_profile');
if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
}

(async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  🦖 Godzilla Consulting — Setup Puppeteer IG Bot');
    console.log('═══════════════════════════════════════════════════');
    console.log('Abriendo navegador chromium en pantalla...');
    
    const browser = await puppeteer.launch({
        headless: false, // Visible para el humano
        userDataDir: userDataDir,
        args: [
            '--window-size=1200,800', 
            '--disable-notifications',
            '--disable-infobars'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('Navegando a la bandeja de entrada de Instagram...');
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    console.log('\n======================================================');
    console.log('🚨 ACCIÓN MANUAL REQUERIDA EN EL NAVEGADOR QUE SE ABRIÓ:');
    console.log('1. Ingresa tu usuario y contraseña de Instagram.');
    console.log('2. Si te pide código 2FA, ingrésalo manualmente.');
    console.log('3. Dale a "Guardar información de inicio de sesión".');
    console.log('4. Cierra popups de "Activar notificaciones" ("Ahora no").');
    console.log('5. CUANDO VEAS TUS DMs CARGADOS, cierras el navegador con la "X".');
    console.log('======================================================\n');
    console.log('El script detectará el cierre y guardará todo automáticamente.');
    
    browser.on('disconnected', () => {
        console.log('\n✅ ¡Navegador cerrado!');
        console.log('💾 La sesión/cookies vivirá ahora permanentemente en:');
        console.log('   ' + userDataDir);
        console.log('\n✅ SETUP COMPLETADO. ¡Corre el bot en PM2 de nuevo!');
        console.log('   pm2 restart godzilla-bot-ig');
        console.log('═══════════════════════════════════════════════════');
        process.exit(0);
    });

})().catch(err => {
    console.error('Fatal Error:', err.message);
    process.exit(1);
});
