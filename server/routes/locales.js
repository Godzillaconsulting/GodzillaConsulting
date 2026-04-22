import express from 'express';
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { translateNodePayload } from '../services/translateService.js';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';


function getLocalData(lng) {
    try {
        const filePath = path.join(SRC_LOCALES_PATH, `${lng}.json`);
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Error loading local JSON for ${lng}:`, e);
        return {};
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_LOCALES_PATH = path.join(__dirname, '../../src/locales');

const router = express.Router();

router.get('/:lng', async (req, res) => {
    let { lng } = req.params;
    if (!lng) lng = 'en'; // Falback safety
    // Parse language code safely (e.g. 'de-DE' -> 'de')
    lng = lng.split('-')[0].toLowerCase();

    // 1. If it's the base bundled language, serve from memory directly.
    if (lng === 'es') return res.json(getLocalData('es'));
    if (lng === 'en') return res.json(getLocalData('en'));

    try {
        // Asegurar esquema en Producción Neon DB (Serverless Auto-Migration)
        await pool.query(`CREATE TABLE IF NOT EXISTS global_locales (lng VARCHAR(10) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // 2. Check if we already have it deeply cached via AI
        const result = await pool.query('SELECT data FROM global_locales WHERE lng = $1', [lng]);
        if (result.rows.length > 0) {
            return res.json(result.rows[0].data);
        }

        // 3. Fallback to generating it JIT
        console.log(`[JIT LOCALE] Generating Universal Translation for locale [${lng}]...`);

        // Call Gemini
        // We modify translateNodePayload params slightly to specify target language
        // Or we create a specific JIT function. It's better to make a specific call:
        const { GoogleGenAI } = await import('@google/genai');
        const aiSDK = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

        if (!aiSDK) {
            throw new Error('No AI Configured for JIT locales');
        }

        const esData = getLocalData('es');

        const instruction = `You are an expert bilingual marketing copywriter. 
Translate the provided Spanish JSON into High-Converting ${lng.toUpperCase()} language. 
Rules:
- Retain the exact same keys and structure.
- Do not translate URLs, email addresses, numeric values or boolean values.
- Ensure the ${lng} text sounds natural, professional, and is oriented to consulting sales.
- Ensure 'features', 'guarantee', 'title' and 'planTarget' sound impactful.
- Return purely the JSON, absolutely no markdown markdown block quotes.`;

        const response = await aiSDK.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [
                    { text: instruction },
                    { text: JSON.stringify(esData) }
                ]}
            ],
            config: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        let translatedObj = null;
        if (response.text) {
            try {
                const cleanJson = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
                translatedObj = JSON.parse(cleanJson);
            } catch (e) {
                console.error('[JIT LOCALE] Failed to parse JSON from Gemini:', e.message);
            }
        }

        if (!translatedObj) {
            console.warn(`[JIT LOCALE] Salvavidas: Guardando fallback en BD para evitar loop infinito en ${lng}.`);
            translatedObj = { ...esData, _jitFailed: true };
        }

        // 4. Save to Database (Even if it's the fallback, to stop the loop)
        await pool.query(`
            INSERT INTO global_locales (lng, data) VALUES ($1, $2)
            ON CONFLICT (lng) DO UPDATE SET data = EXCLUDED.data
        `, [lng, translatedObj]);

        console.log(`[JIT LOCALE] Generated and cached locale [${lng}] successfully!`);
        res.json(translatedObj);
        
    } catch (error) {
        console.error('[JIT LOCALE] Error Network:', error);
        
        // Salvavidas de emergencia: Guardar en BD para evitar loops por red
        if (typeof esData !== 'undefined') {
            await pool.query(`
                INSERT INTO global_locales (lng, data) VALUES ($1, $2)
                ON CONFLICT (lng) DO UPDATE SET data = EXCLUDED.data
            `, [lng, { ...esData, _jitNetworkFailed: true }]).catch(()=>{});
        }
        
        return res.json(getLocalData('en'));
    }
});

export default router;
