require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  console.log('🚀 Iniciando Browser para login manual...');
  const browser = await puppeteer.launch({
    headless: false, // Modo visible para que el usuario inicie sesión
    userDataDir: './session_data', // Guarda cookies y localstorage
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2' });

  console.log('------------------------------------------------------');
  console.log('🟢 Por favor, inicia sesión manualmente en la ventana de Chrome.');
  console.log('🔴 Una vez que hayas iniciado sesión y estés en la página principal, cierra esta ventana (Ctrl+C en la terminal) o cierra el navegador.');
  console.log('------------------------------------------------------');

  // Mantener abierto hasta que el usuario cierre el navegador
  browser.on('disconnected', () => {
    console.log('✅ Sesión guardada. Browser cerrado.');
    process.exit(0);
  });
})();
