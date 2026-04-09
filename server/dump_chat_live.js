import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

(async () => {
    console.log("Iniciando volcado del chat activo...");
    const sessionDir = path.join(path.dirname(__dirname), 'tiktok_session');
    
    const browser = await puppeteer.launch({
        headless: true,
        userDataDir: sessionDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.goto('https://www.tiktok.com/messages', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));
        
        console.log("Abriendo primer chat...");
        const firstChat = await page.$('[data-e2e="chat-list-item"]');
        if (firstChat) {
            await firstChat.click();
            await new Promise(r => setTimeout(r, 4000)); 
            
            // Extraer solo los chat-item
            const chatItems = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('[data-e2e="chat-item"]')).map(el => el.outerHTML);
            });
            fs.writeFileSync(path.join(__dirname, 'chat_items_dump.html'), chatItems.join('\n\n---SEPARATOR---\n\n'));
            console.log("✅ Volcado guardado en chat_items_dump.html");
        }
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
