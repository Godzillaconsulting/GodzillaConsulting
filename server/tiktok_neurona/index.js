require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const BRAIN_API_URL = process.env.BRAIN_API_URL || 'http://localhost:3001/api/ai-brain';
const POLLING_INTERVAL_MS = process.env.POLLING_INTERVAL_MS || 45000; // 45 segundos

// Memoria de mensajes procesados para no repetir
const processedMessages = new Set();

// Función de retardo aleatorio
const delay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

async function sendToCentralBrain(text, context) {
  console.log(`🧠 Enviando a Cerebro Central: "${text}" [${context}]`);
  try {
    const res = await fetch(BRAIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, context })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.reply || "Mensaje recibido y procesado.";
  } catch (err) {
    console.error('❌ Error contactando al Cerebro Central:', err.message);
    return null;
  }
}

async function simulateHumanTyping(page, selector, text) {
  console.log(`⌨️ Escribiendo: "${text}"`);
  await page.waitForSelector(selector);
  await page.click(selector);
  // Retraso entre teclas de 50ms a 150ms
  for (let i = 0; i < text.length; i++) {
    await page.type(selector, text[i], { delay: Math.floor(Math.random() * 100) + 50 });
  }
  await delay(500, 1500);
  await page.keyboard.press('Enter');
  console.log(`✅ Mensaje enviado.`);
}

async function scrapeAndRespondDMs(page) {
  try {
    console.log('🔍 Revisando DMs...');
    await page.goto('https://www.tiktok.com/messages', { waitUntil: 'networkidle2' });
    await delay(3000, 6000);

    // TODO: Ajustar selectores según el DOM actual de TikTok
    // Este es un pseudo-selector como placeholder
    // En la realidad, TikTok usa clases ofuscadas. Una estrategia es buscar elementos por ARIA o elementos interactivos.
    
    // Ejemplo de lógica que se inyectaría en la página para extraer textos
    const unreadChats = await page.evaluate(() => {
        // Pseudo-logic to find unread messages or recent messages
        // Currently returning empty to prevent breaking. Needs actual DOM inspection to map classes.
        return []; 
    });

    for (const chat of unreadChats) {
      if (!processedMessages.has(chat.id)) {
        processedMessages.add(chat.id);
        const aiResponse = await sendToCentralBrain(chat.text, 'DM');
        if (aiResponse) {
          // Selecciona el input de chat (placeholder)
          const inputSelector = 'div[data-e2e="chat-input"]'; 
          // En la implementación real, primero hacemos click en el chat de la lista
          await simulateHumanTyping(page, inputSelector, aiResponse);
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Error en scrapeAndRespondDMs:', err.message);
  }
}

async function main() {
  console.log('🚀 Iniciando Neurona de TikTok...');
  const browser = await puppeteer.launch({
    headless: true, // Corriendo en PM2 va headless
    userDataDir: './session_data',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Rotar User-Agent aleatoriamente o fijar uno robusto
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Loop infinito de scraping
  while (true) {
    try {
      await scrapeAndRespondDMs(page);
      // await scrapeAndRespondComments(page); // TODO: Agregar sección de comentarios
    } catch (e) {
      console.error('Error en el loop principal:', e);
    }
    
    console.log(`💤 Esperando ${POLLING_INTERVAL_MS / 1000} segundos...`);
    await delay(POLLING_INTERVAL_MS, POLLING_INTERVAL_MS + 10000); // Polling + retardo aleatorio extra
  }
}

main().catch(err => console.error('Error fatal:', err));
