import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

(async () => {
    console.log("Iniciando dump del DOM...");
    const sessionDir = path.join(path.dirname(__dirname), 'tiktok_session');
    
    // Si no puede leer las cookies porque pm2 las está usando, PM2 debe estar parado
    const browser = await puppeteer.launch({
        headless: true, // headless para que el user no lo vea
        userDataDir: sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("Navegando a messages...");
        await page.goto('https://www.tiktok.com/messages', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));
        
        console.log("Clicking el primer chat para cargar mensajes...");
        const firstChat = await page.$('[data-e2e="chat-list-item"]');
        if (firstChat) {
            await firstChat.click();
            await new Promise(r => setTimeout(r, 4000)); // wait for chat to load
        }
        
        console.log("Extrayendo HTML y Selectores interesantes...");
        const html = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(path.join(__dirname, 'tiktok_dom_dump.html'), html);
        console.log("HTML guardado en tiktok_dom_dump.html");
    } catch(e) {
        console.error("Error", e);
    } finally {
        await browser.close();
        console.log("Terminado.");
    }
})();
