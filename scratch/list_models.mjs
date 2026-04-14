import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const key = process.env.GEMINI_API_KEY;
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`);
const data = await res.json();

if (!data.models) { console.error('Error:', JSON.stringify(data)); process.exit(1); }

const relevant = data.models.filter(m => /imagen|veo|flash|gemini-3|image/i.test(m.name));
console.log('=== Modelos disponibles (relacionados a imagen/video) ===');
for (const m of relevant) {
    console.log(`  ${m.name}  [${(m.supportedGenerationMethods||[]).join(', ')}]`);
}
