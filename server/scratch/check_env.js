import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL_DEV exists:", !!process.env.DATABASE_URL_DEV);
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("ELEVENLABS_API_KEY exists:", !!process.env.ELEVENLABS_API_KEY);
console.log("PEXELS_API_KEY exists:", !!process.env.PEXELS_API_KEY);
