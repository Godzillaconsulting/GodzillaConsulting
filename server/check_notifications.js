import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

(async () => {
    console.log("Iniciando revisión de notificaciones...");
    const sessionDir = path.join(path.dirname(__dirname), 'tiktok_session');
    
    const browser = await puppeteer.launch({
        headless: true,
        userDataDir: sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.goto('https://www.tiktok.com/notification', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));
        
        console.log("Extrayendo DOM de notificaciones...");
        const html = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(path.join(__dirname, 'tiktok_notifications_dump.html'), html);
        console.log("✅ Dump completado.");
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
