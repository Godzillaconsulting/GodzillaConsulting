import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

(async () => {
    console.log("Iniciando revisión de comentarios...");
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
        
        console.log("Haciendo click en la pestaña de Comentarios...");
        await page.evaluate(() => {
            const commentsTab = document.querySelector('[data-e2e="comments"]');
            if (commentsTab) commentsTab.click();
        });
        
        await new Promise(r => setTimeout(r, 4000));
        
        const html = await page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(path.join(__dirname, 'comments_dump.html'), html);
        console.log("✅ Dump completado.");
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
