// Verificar qué API Key está cargando el servidor en tiempo real
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY || 'NO ENCONTRADA';
console.log('Key en .env: ...', key.slice(-8));
console.log('Key completa empieza con:', key.substring(0, 15));
