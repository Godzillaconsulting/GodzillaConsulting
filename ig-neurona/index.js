import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_DATA_DIR = path.join(__dirname, 'session_data');

// Configuraciones (Ajustes de Velocidad Extrema, simulando Websocket Realtime)
const POLLING_INTERVAL_MIN = 8000; // 8 segundos
const POLLING_INTERVAL_MAX = 15000; // 15 segundos
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:3000/api/ai/chat';

puppeteer.use(StealthPlugin());

// Retardo aleatorio para simular comportamiento humano
const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

// Función para simular escritura humana
async function humanType(page, selector, text) {
    await page.waitForSelector(selector, { timeout: 8000 });
    await page.click(selector);
    await randomDelay(100, 300);
    // Puppeteer soporta emojis y caracteres especiales como ¿ o ¡ usando type()
    await page.type(selector, text, { delay: Math.floor(Math.random() * (25 - 10 + 1)) + 10 });
}

// Emular movimiento de mouse aleatorio
async function randomMouseMove(page) {
    const width = 1200;
    const height = 800;
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    await page.mouse.move(x, y, { steps: 10 });
    await randomDelay(200, 500);
}

const unreadMessagesCache = new Set();

async function processUnreadChats(page) {
    console.log('🔄 Escaneando bandeja de entrada en busca de nuevos DMs...');
    
    // Selectores clave (Nota: Instagram cambia sus clases frecuentemente)
    // Buscamos cualquier chat en la lista que tenga el indicador de "punto azul" de no leído o fuente en negrita
    // Alternativa estable: buscar elementos en la lista de chats que contengan un indicador de nuevo mensaje.
    // Usaremos un selector genérico para los contenedores de chat en la bandeja.
    
    const chatRowSelector = 'div[role="listitem"], a[role="link"], div[role="button"]'; 
    const inputSelector = '[contenteditable="true"]';
    
    try {
        // Obtenemos todos los posibles elementos que parezcan botones o listitems sin timeout bloqueante
        await randomDelay(1000, 2000);
        let chats = [];
        try {
             chats = await page.$$(chatRowSelector);
        } catch(e) {}
        
        if (!chats || chats.length === 0) {
            console.log('🛌 No hay chats cargados o Meta cambió agresivamente el DOM.');
            return;
        }

        let foundUnread = false;

        for (const chat of chats) {
            // Evaluamos si el chat está "No leído".
            // Una técnica heurística: si hay un texto que dice "1 nuevo mensaje" o un punto azul.
            // Para simplificar, haremos click en los primeros chats y verificaremos si el último mensaje es nuestro o no, pero mejor detectar el azul.
            const isUnread = await page.evaluate((el) => {
                // 1. Detección por texto o aria-label: a veces IG pone "Unread" o "Nuevo mensaje" invisible
                const htmlStr = el.innerHTML.toLowerCase();
                if (htmlStr.includes('no leído') || htmlStr.includes('unread') || htmlStr.includes('nuevo mensaje') || htmlStr.includes('new message')) {
                    return true;
                }

                // 2. Detección visual del Punto Azul (Notificación)
                const allNodes = el.querySelectorAll('span, div');
                for (let node of allNodes) {
                    const style = window.getComputedStyle(node);
                    const bg = style.backgroundColor || '';
                    if ((bg.includes('149, 246') || bg.includes('0, 100, 224') || bg.includes('10, 120, 255')) && style.borderRadius.includes('50')) {
                        return true;
                    }
                }
                
                // 3. Detección por fuente en Negrita (Bold)
                const textNodes = el.querySelectorAll('span[dir="auto"], div[dir="auto"]');
                for (let textDiv of textNodes) {
                    const fw = window.getComputedStyle(textDiv).fontWeight;
                    if (fw === '600' || fw === '700' || fw === 'bold' || parseInt(fw) >= 600) {
                        return true;
                    }
                }
                return false;
            }, chat);

            if (isUnread) {
                foundUnread = true;
                console.log('💬 Nuevo chat no leído detectado. Entrando...');
                
                // Forzar click en el enlace interno para asegurar que se abra el chat
                await page.evaluate((el) => {
                    const a = el.querySelector('a');
                    if (a) a.click();
                    else el.click();
                }, chat);

                // Esperar a que la caja de texto aparezca explícitamente (es la mejor prueba de que el chat ya cargó)
                try {
                     await page.waitForSelector(inputSelector, { timeout: 10000 });
                } catch(e) {
                     console.log('⚠️ No cargó el chat a tiempo, saltando por ahora.');
                     continue;
                }
                await randomDelay(1000, 1500); // Tiempo rápido para leer los textos estabilizados

                // Extraer el último mensaje recibido
                const getLastMessage = await page.evaluate(() => {
                    // Los mensajes recientes suelen estar al final del contenedor principal interactivo
                    const messages = document.querySelectorAll('div[dir="auto"], span[dir="auto"]');
                    const messageTexts = Array.from(messages)
                        .map(m => m.innerText)
                        .filter(t => t && t.trim().length > 0 && 
                                     !t.includes('Activo ahora') && 
                                     !t.includes('Responder') && 
                                     !t.includes('Send a message'));
                    return messageTexts[messageTexts.length - 1] || '';
                });

                console.log(`📩 Mensaje recibido: "${getLastMessage}"`);
                
                if (!getLastMessage || getLastMessage.trim() === '') {
                    console.log('⚠️ Mensaje vacío o indetectable. Evitando llamada a la IA.');
                    continue;
                }

                // Enviar al Cerebro Central IA
                console.log('🤖 Consultando al Cerebro Central Inteligente (zillabot)...');
                let aiResponseText = "";
                
                try {
                    // Mantenemos una memoria conversacional en RAM parecida al antiguo bot.
                    // Para identificar la sesión, extraemos temporalmente la URL que contiene el thread ID 
                    const threadUrl = await page.url();
                    const threadIdMatch = threadUrl.match(/t\/(\w+)/);
                    const threadId = threadIdMatch ? threadIdMatch[1] : 'default_thread';

                    if (!global.igMem) global.igMem = new Map();
                    if (!global.igMem.has(threadId)) global.igMem.set(threadId, []);
                    const history = global.igMem.get(threadId);
                    
                    history.push({ role: 'user', content: getLastMessage });

                    // Limitar memoria a los últimos 15 mensajes
                    if (history.length > 15) history.shift();

                    const response = await axios.post('http://localhost:3000/api/chat', {
                        messages: history,
                        isGoyi: false
                    });
                    
                    aiResponseText = response.data.reply || "Lo siento, falló la conexión local del Cerebro.";
                    
                    // Asegurarse de que el bot tenga en cuenta que ya lo dijo para contexto futuro
                    history.push({ role: 'assistant', content: aiResponseText });

                } catch (apiErr) {
                    console.error('❌ Error comunicando con Cerebro Central Local:', apiErr.message);
                    aiResponseText = "Lo siento, mi circuito lógico está procesando otra orden. En breve te ayudaré.";
                }

                // Inyectamos la respuesta asegurándonos de separarla si es muy larga
                if (aiResponseText.length > 900) {
                     const chunks = aiResponseText.match(/.{1,800}(\s|$)/gs) || [aiResponseText];
                     for (let chunk of chunks) {
                         console.log(`📝 Escribiendo fragmento: "${chunk}"`);
                         await humanType(page, inputSelector, chunk.trim());
                         await randomDelay(500, 1000);
                         await page.keyboard.press('Enter');
                         await randomDelay(1500, 3000);
                     }
                } else {
                     console.log(`📝 Escribiendo respuesta: "${aiResponseText}"`);
                     await humanType(page, inputSelector, aiResponseText);
                     await randomDelay(500, 1000);
                     await page.keyboard.press('Enter');
                }
                
                console.log('✅ Mensaje enviado (Cerebro IA Activo).');
                
                await randomDelay(2000, 5000);
            }
        }

        if (!foundUnread) {
            console.log('🛌 Ningún mensaje nuevo. Esperando el próximo ciclo.');
        }

    } catch (error) {
        console.error('⚠️ Error al escanear/procesar chats:', error.message);
    }
}

async function main() {
    console.log('🚀 Iniciando IG Neurona (Headless Mode)...');
    
    const browser = await puppeteer.launch({
        headless: true, // Correr en segundo plano
        userDataDir: USER_DATA_DIR,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    
    // Configurar viewport humano standard
    await page.setViewport({ width: 1366, height: 768 });

    // Emular un User Agent razonable
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    console.log('🌐 Navegando a Instagram Direct...');
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    // Esperar un poco a que todo se estabilice
    await randomDelay(5000, 8000);

    // Ciclo Infinito de Polling
    while (true) {
        // Mover el ratón ocasionalmente
        await randomMouseMove(page);

        // Asegurarnos de que estamos en la subURL correcta, por si se movió o deslogueó
        if (!page.url().includes('/direct/inbox')) {
            console.warn('⚠️ No estamos en /direct/inbox, recargando bandeja...');
            await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
            await randomDelay(3000, 5000);
        }

        // Checar alertas de "Activar Notificaciones" (a veces Instagram saca un modal bloqueante que dice "Activar notificaciones", le damos "Ahora no")
        try {
            const notNowButton = await page.$('button._a9--._ap36._a9_1'); // Suelen tener estos hashes.
            if (notNowButton) {
                console.log('🛡️ Cerrando modal de notificaciones...');
                await notNowButton.click();
            }
        } catch (e) {} // Ignorar si falla

        await processUnreadChats(page);

        // Espera random para el siguiente ciclo de polling
        const delay = Math.floor(Math.random() * (POLLING_INTERVAL_MAX - POLLING_INTERVAL_MIN + 1)) + POLLING_INTERVAL_MIN;
        console.log(`⏱️ Descansando... próximo escaneo en ${(delay / 1000).toFixed(1)}s`);
        await randomDelay(delay, delay);
    }
}

main().catch(err => {
    console.error('💥 Falla crítica en Neurona:', err);
    process.exit(1);
});
