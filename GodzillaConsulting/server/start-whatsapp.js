// start-whatsapp.js
// Punto de entrada aislado para el bot de WhatsApp gestionado por PM2
import { initWhatsAppBot } from './whatsappBot.js';

console.log("🚀 Iniciando proceso aislado de WhatsApp Bot...");
initWhatsAppBot();
