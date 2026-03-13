// start-instagram.js
// Punto de entrada aislado para el bot de Instagram gestionado por PM2
import { startIgBot } from './instagramBot.js';

console.log("🚀 Iniciando proceso aislado de Instagram Bot...");
startIgBot();
