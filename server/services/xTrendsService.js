import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import path from 'path';
import { existsSync } from 'fs';

/**
 * Servicio para raspar las tendencias actuales de X (Twitter)
 * Utiliza la sesión guardada en .puppeteer_x_profile
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

async function simulateHumanBehavior(page) {
    console.log('[XTrends] 🤖 Simulando comportamiento humano (evadiendo baneos)...');
    
    // Espera inicial aleatoria (3-5 seg)
    await randomDelay(3000, 5000);

    // Bajar un poco (como si leyéramos la primera nota)
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(2000, 4000);

    // Bajar más (como haciendo scroll lento por 20 seg en total)
    console.log('[XTrends] 👀 Leyendo tendencias de arriba a abajo...');
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 400));
        await randomDelay(3000, 5000); // Promedio de 4 seg * 5 = 20 seg
    }

    // Subir un poco de regreso
    await page.evaluate(() => window.scrollBy(0, -600));
    await randomDelay(1000, 2000);

    // Pausa larga final antes de raspar como si "eligiera" una nota (17 a 30 seg)
    console.log('[XTrends] 🤔 Analizando notas a fondo...');
    await randomDelay(17000, 30000);
}

export const scrapeXTrends = async () => {
    const userDataDir = path.join(process.cwd(), 'server', '.puppeteer_x_profile');
    
    if (!existsSync(userDataDir)) {
        throw new Error('No se encontró el perfil de X. Por favor ejecuta el setup interactivo primero (node server/x_puppeteer_setup.cjs)');
    }

    let browser;
    try {
        console.log('[XTrends] Lanzando navegador invisible para raspar tendencias...');
        browser = await puppeteer.launch({
            headless: 'new', // Invisible para el scrapeo real
            userDataDir: userDataDir,
            args: [
                '--window-size=1200,800', 
                '--disable-notifications',
                '--disable-infobars',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Bloquear recursos innecesarios para mayor velocidad
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if(['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())){
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log('[XTrends] Navegando a X Explore Trending...');
        await page.goto('https://twitter.com/explore/tabs/trending', { waitUntil: 'networkidle2', timeout: 30000 });

        // Esperar a que carguen los elementos de tendencia (los contenedores suelen tener el atributo data-testid="trend")
        console.log('[XTrends] Esperando a que carguen los datos...');
        try {
            await page.waitForSelector('[data-testid="trend"]', { timeout: 10000 });
        } catch (e) {
            console.log('[XTrends] Selector de "trend" no encontrado, intentando con "cellInnerDiv"...');
            await page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 10000 });
        }

        // Simular que un humano está leyendo antes de extraer los datos
        await simulateHumanBehavior(page);

        console.log('[XTrends] Extrayendo temas...');
        const trends = await page.evaluate(() => {
            const trendElements = Array.from(document.querySelectorAll('[data-testid="trend"]'));
            
            return trendElements.map(el => {
                // El DOM de Twitter es ofuscado, pero usualmente el nombre de la tendencia está en un div con dir="ltr"
                const textNodes = Array.from(el.querySelectorAll('div[dir="ltr"] > span')).map(n => n.innerText);
                
                let topic = "";
                let traffic = "";
                let category = "Tendencia de X";

                if (textNodes.length >= 1) {
                    topic = textNodes[0];
                }
                
                // Buscar si hay cantidad de posts (ej: "15K posts")
                const postNodes = Array.from(el.querySelectorAll('span')).map(n => n.innerText);
                const postText = postNodes.find(t => t.toLowerCase().includes('post') || t.toLowerCase().includes('tweet'));
                if (postText) {
                    traffic = postText;
                } else {
                    traffic = "Tendencia Activa";
                }

                // A veces la categoría (ej: "Trending in Mexico") está al principio
                const catText = Array.from(el.querySelectorAll('span')).map(n => n.innerText).find(t => t.toLowerCase().includes('trending') || t.toLowerCase().includes('tendencia'));
                if (catText) {
                    category = catText;
                }

                return {
                    topic,
                    category,
                    traffic,
                    description: `Tendencia actual en X (Twitter): ${topic}`
                };
            }).filter(t => t.topic && t.topic.trim() !== "");
        });

        console.log(`[XTrends] ¡Éxito! Se extrajeron ${trends.length} tendencias de X.`);
        return trends;

    } catch (error) {
        console.error('[XTrends] Error raspando tendencias de X:', error.message);
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: path.join(process.cwd(), 'scratch', 'x_error.png') });
                    console.log('[XTrends] Screenshot de error guardado en scratch/x_error.png');
                }
            } catch (ssErr) {}
        }
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
