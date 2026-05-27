import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
dotenv.config({ path: envPath });
console.log(`[MediaWorker] 🌐 Env loaded from: ${envPath}`);
console.log(`[MediaWorker] 🔑 ElevenLabs Key exists: ${!!process.env.ELEVENLABS_API_KEY}`);
import pool from '../config/db.js';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
// using global native fetch
import { generateVoice } from '../services/ttsService.js';
import { removeWatermark } from '../utils/videoProcessor.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pkgWave from 'wavefile';
const { WaveFile } = pkgWave;
import ytSearch from 'yt-search';
import youtubedl from 'youtube-dl-exec';
import * as cheerio from 'cheerio';

// Helper: Formato de tiempo para SRT
function formatSrtTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}

// Helper: Google Translate gratuito sin API key como fallback robusto
async function translateWithGoogleFree(text) {
    try {
        console.log(`[Translate] Traduciendo con Google Translate gratuito...`);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const translation = json[0].map(x => x[0]).join('');
        return translation || text;
    } catch (err) {
        console.warn(`[Translate] Falló Google Translate gratuito: ${err.message}`);
        return text;
    }
}

// Traducir narración en español a inglés usando Gemini, con fallback a Google Translate
async function translateTextToEnglish(text) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("[Translate] GEMINI_API_KEY no configurada. Usando Google Translate gratuito.");
        return translateWithGoogleFree(text);
    }
    try {
        console.log(`[Translate] Traduciendo narración a inglés con Gemini...`);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following Spanish video narration text to English for video subtitles/captions. Maintain a matching tone, keep it punchy and short. Only return the direct English translation text, do not include quotes, prefix, or extra text:\n\n${text}`
        });
        const translated = response.text?.trim() || text;
        console.log(`[Translate] Traducción lista: "${translated.substring(0, 40)}..."`);
        return translated;
    } catch (e) {
        console.warn(`[Translate] Error traduciendo con Gemini: ${e.message}. Usando Google Translate gratuito...`);
        return translateWithGoogleFree(text);
    }
}

// Construye cues de subtítulos con tiempos reales del JSON de Edge TTS
function buildSrtFromEdgeTtsJson(jsonPath, maxWords = 3, maxDurationMs = 1500) {
    if (!fs.existsSync(jsonPath)) return null;
    try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) return null;

        const cues = [];
        let currentWords = [];
        let currentStart = null;
        let currentEnd = null;

        for (let i = 0; i < data.length; i++) {
            const word = data[i];
            const text = word.part.trim();
            if (!text) continue;

            if (currentWords.length === 0) {
                currentStart = word.start;
            }
            currentWords.push(text);
            currentEnd = word.end;

            // Cortar si hay signos de puntuación fuertes o si alcanzamos límites
            const isPunctuation = text.endsWith('.') || text.endsWith('!') || text.endsWith('?') || text.endsWith(',');
            const duration = currentEnd - currentStart;

            if (currentWords.length >= maxWords || duration >= maxDurationMs || isPunctuation || i === data.length - 1) {
                cues.push({
                    text: currentWords.join(' '),
                    start: currentStart / 1000, // a segundos
                    end: currentEnd / 1000
                });
                currentWords = [];
            }
        }

        return cues;
    } catch (e) {
        console.error("[SRT] Error al construir subtítulos desde el JSON de Edge TTS:", e);
        return null;
    }
}

// Traduce la lista de fragmentos (cues) a inglés preservando correspondencia 1:1
async function translateCuesToEnglish(cues) {
    if (cues.length === 0) return [];
    if (!process.env.GEMINI_API_KEY) {
        console.warn("[Translate] GEMINI_API_KEY no configurada. Retornando textos en español.");
        return cues.map(c => c.text);
    }
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const spanishTexts = cues.map(c => c.text);
        const prompt = `Translate the following list of Spanish subtitle text cues to English for video captions. Maintain a matching tone, keep it punchy and short. You MUST return a JSON array of strings of the exact same length (${spanishTexts.length}), where each index contains the English translation of the corresponding Spanish index. Do not combine or omit items. Keep the response as valid JSON only, without markdown formatting.\n\nList: ${JSON.stringify(spanishTexts)}`;

        console.log(`[Translate] Traduciendo cues a inglés en lote...`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        let cleanedText = response.text?.trim() || "";
        // Quitar bloques de código markdown si los incluye
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.substring(7, cleanedText.length - 3).trim();
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.substring(3, cleanedText.length - 3).trim();
        }
        
        const englishTexts = JSON.parse(cleanedText);
        if (Array.isArray(englishTexts) && englishTexts.length === cues.length) {
            console.log(`[Translate] Cues traducidos con éxito en lote.`);
            return englishTexts;
        } else {
            console.warn(`[Translate] La longitud del array traducido (${englishTexts?.length}) no coincide con el original (${cues.length}).`);
        }
    } catch (e) {
        console.warn(`[Translate] Error al traducir cues en lote: ${e.message}. Usando fallback individual.`);
    }

    // Fallback individual si el lote falla
    const translatedTexts = [];
    for (const cue of cues) {
        const trans = await translateTextToEnglish(cue.text);
        translatedTexts.push(trans);
    }
    return translatedTexts;
}

// Helper: Formato de tiempo para ASS (H:MM:SS.cc)
function formatAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

// Generar archivo ASS con subtítulos (Inglés arriba en Blanco, Español abajo en Amarillo) dentro del mismo bloque
function generateAssSubtitles(cuesEn, cuesEs) {
    let ass = `[Script Info]
Title: Dual Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: StyleDefault,Arial,48,&H00FFFFFF&,&H000000FF&,&H00000000&,&H00000000&,1,0,0,0,100,100,0,0,1,1.5,0,2,10,10,650,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Asumiendo que cuesEn y cuesEs tienen la misma longitud y alineación temporal
    const len = Math.min(cuesEn.length, cuesEs.length);
    for (let i = 0; i < len; i++) {
        const cueEn = cuesEn[i];
        const cueEs = cuesEs[i];
        
        const textEn = cueEn.text.trim().replace(/\n/g, ' ');
        const textEs = cueEs.text.trim().replace(/\n/g, ' ');
        
        // Poner inglés arriba (blanco) y español abajo (amarillo)
        const combinedText = `${textEn}\\N{\\c&H0000FFFF&}${textEs}`;
        
        ass += `Dialogue: 0,${formatAssTime(cueEn.start)},${formatAssTime(cueEn.end)},StyleDefault,,0000,0000,0000,,${combinedText}\n`;
    }

    return ass;
}

// Generador de cues alternativo si EdgeTTS no devuelve tiempos
function generateFallbackCues(text, duration) {
    const cleanText = text.replace(/Escena \d+:\s*/gi, '').trim();
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const chunkSize = 3;
    const cues = [];
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    const numChunks = chunks.length;
    const chunkDuration = duration / numChunks;
    
    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkDuration;
        const end = Math.min((i + 1) * chunkDuration, duration);
        cues.push({
            text: chunks[i],
            start: start,
            end: end
        });
    }
    return cues;
}

// Helper: Convertir chunks de Whisper a SRT
function chunksToSRT(chunks) {
    let srt = '';
    let counter = 1;
    let currentPhrase = [];
    
    const flushPhrase = () => {
        if (currentPhrase.length === 0) return;
        const start = currentPhrase[0].timestamp[0];
        const end = currentPhrase[currentPhrase.length - 1].timestamp[1];
        if (start === null || end === null) return;
        const text = currentPhrase.map(w => w.text.trim().toUpperCase()).join(' ');

        srt += `${counter}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${text}\n\n`;
        counter++;
        currentPhrase = [];
    };

    chunks.forEach(chunk => {
        if (!chunk.timestamp || chunk.timestamp[0] === null || chunk.timestamp[1] === null) return;
        currentPhrase.push(chunk);
        // Cortar frases cortas y contundentes
        if (chunk.text.match(/[.!?]$/) || currentPhrase.length >= 4) {
            flushPhrase();
        }
    });
    flushPhrase();
    return srt;
}

function escapeSubtitlesPath(filePath) {
    let absolutePath = path.resolve(filePath);
    absolutePath = absolutePath.replace(/\\/g, '/');
    absolutePath = absolutePath.replace(/^([a-zA-Z]):/, '$1\\:');
    absolutePath = absolutePath.replace(/'/g, "'\\\\''");
    return absolutePath;
}

if (process.platform === 'linux') {
    const localFfmpeg = '/app/node_modules/.pnpm/@ffmpeg-installer+linux-x64@4.1.0/node_modules/@ffmpeg-installer/linux-x64/ffmpeg';
    const localFfprobe = '/app/node_modules/.pnpm/@ffprobe-installer+linux-x64@5.2.0/node_modules/@ffprobe-installer/linux-x64/ffprobe';
    
    if (fs.existsSync('/usr/bin/ffmpeg')) {
        ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
    } else if (fs.existsSync(localFfmpeg)) {
        ffmpeg.setFfmpegPath(localFfmpeg);
    } else {
        ffmpeg.setFfmpegPath(ffmpegPath.path);
    }

    if (fs.existsSync('/usr/bin/ffprobe')) {
        ffmpeg.setFfprobePath('/usr/bin/ffprobe');
    } else if (fs.existsSync(localFfprobe)) {
        ffmpeg.setFfprobePath(localFfprobe);
    } else {
        ffmpeg.setFfprobePath(ffprobePath.path);
    }
} else {
    ffmpeg.setFfmpegPath(ffmpegPath.path);
    ffmpeg.setFfprobePath(ffprobePath.path);
}

const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || (process.platform === 'win32' ? 'E:/Godzilla_Studio_Cache/outputs' : path.resolve(process.cwd(), 'outputs'));
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let isProcessing = false;

// Enviar progreso a la API local para actualizar CEO Estudio en tiempo real
async function sendProgress(taskId, progress, msg) {
    try {
        await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/studio/internal-progress/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress, msg })
        });
    } catch (e) {}
}

const STOCK_VIDEOS = [
  'https://cdn.coverr.co/videos/coverr-a-person-typing-on-a-laptop-5291/1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-person-counting-dollar-bills-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-walking-in-a-crowded-city-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-man-working-out-at-the-gym-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-crypto-trading-1080p.mp4'
];

let googleQuotaExceeded = false;

// Generación de imagen con Google Imagen 4 (SDK nuevo) o Fallback a Gemini 2.5 Flash (solo APIs de Google)
async function generateGoogleImage(prompt, outputPath, aspect_ratio = '9:16') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured.");
    }

    console.log(`[GoogleImageGen] Generando imagen para prompt: "${prompt.substring(0, 50)}..."`);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 1. Intentar con Imagen 4.0
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspect_ratio === '9:16' ? '9:16' : '1:1'
            }
        });
        if (response.generatedImages?.[0]?.image?.imageBytes) {
            const b64 = response.generatedImages[0].image.imageBytes;
            fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
            console.log(`[GoogleImageGen] ✅ Imagen generada con éxito usando Imagen 4.`);
            return outputPath;
        }
    } catch (err) {
        console.warn(`[GoogleImageGen] ⚠️ Imagen 4.0 falló: ${err.message}. Probando con Gemini Flash Image...`);
    }

    // 2. Intentar con Gemini 2.5 Flash Image output
    try {
        const promptWithAr = prompt + `\n\n[CRITICAL: Frame the image strictly in ${aspect_ratio} aspect ratio orientation.]`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: promptWithAr }] }],
            config: { responseModalities: ['IMAGE'] }
        });
        for (const part of (response.candidates?.[0]?.content?.parts || [])) {
            if (part.inlineData?.data) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`[GoogleImageGen] ✅ Imagen generada con éxito usando Gemini 2.5 Flash.`);
                return outputPath;
            }
        }
    } catch (err) {
        console.warn(`[GoogleImageGen] ⚠️ Gemini Flash Image falló: ${err.message}.`);
    }

    // Fallback final a imagen de test local si todo lo de Google falla
    console.warn(`[GoogleImageGen] ❌ Todas las APIs de Google fallaron. Usando copia de test_turbo.jpg.`);
    fs.copyFileSync(path.resolve(process.cwd(), 'test_turbo.jpg'), outputPath);
    return outputPath;
}

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA MULTI-FUENTE DE STOCK MEDIA — 100% GRATIS, CERO REGISTRO
// Prioridad: Coverr.co Video → Openverse Fotos → Wikimedia Fotos → Loremflickr
//            [Pexels/Pixabay si el usuario tiene keys] → Google Imagen AI
// ══════════════════════════════════════════════════════════════════════════════

// Descargador genérico de video (MP4 URL directa) con FFmpeg
async function downloadAndTrimVideo(videoUrl, outputPath, targetDuration) {
    const tempPath = outputPath.replace('.mp4', '_raw.mp4');
    const res = await fetch(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} descargando video: ${videoUrl}`);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
    
    const tempCropped = outputPath.replace('.mp4', '_cropped.mp4');
    await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
            .setDuration(targetDuration)
            .outputOptions([
                '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1',
                '-c:v libx264', '-preset ultrafast', '-threads 2', '-crf 26', '-pix_fmt yuv420p', '-an'
            ])
            .save(tempCropped)
            .on('end', resolve).on('error', reject);
    });
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    fs.renameSync(tempCropped, outputPath);
    return outputPath;
}

// Descargador genérico de foto directa
async function downloadPhoto(photoUrl, outputPath) {
    const res = await fetch(photoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} descargando foto`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    return outputPath;
}

// 1. COVERR.CO — Videos HD GRATIS sin watermark, sin registro
async function searchCoverrVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    console.log(`[Coverr] 🎬 Buscando: "${keyword}"`);
    const res = await fetch(
        `https://coverr.co/api/videos/?q=${encodeURIComponent(keyword)}&per_page=20&page=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) throw new Error(`Coverr API error: ${res.status}`);
    const data = await res.json();
    const hits = (data.hits || []).filter(v =>
        !v.is_premium && v.playback_id && parseFloat(v.duration) > 5 && !usedUrls.has(v.id)
    );
    if (hits.length === 0) throw new Error(`Coverr: sin resultados para "${keyword}"`);
    const picked = hits[Math.floor(Math.random() * Math.min(6, hits.length))];
    usedUrls.add(picked.id);
    console.log(`[Coverr] ✅ "${picked.title}" | ${picked.duration}s`);
    for (const q of ['medium', 'high', 'low']) {
        try { return await downloadAndTrimVideo(`https://stream.mux.com/${picked.playback_id}/${q}.mp4`, outputPath, targetDuration); }
        catch(e) { console.log(`[Coverr] Quality ${q} falló: ${e.message}`); }
    }
    throw new Error(`Coverr: no se pudo descargar "${picked.title}"`);
}

// 2. OPENVERSE — Fotos CC 100% gratis, sin registro (20 req/min)
async function searchOpenversePhoto(keyword, outputPath, usedUrls = new Set()) {
    console.log(`[Openverse] 🖼️ Buscando: "${keyword}"`);
    const res = await fetch(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(keyword)}&page_size=20&license_type=commercial`,
        { headers: { 'User-Agent': 'GodzillaStudio/1.0 (contact@godzillaconsulting.ai)' } }
    );
    if (!res.ok) throw new Error(`Openverse API error: ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).filter(p =>
        p.url && !usedUrls.has(p.id) &&
        (p.filetype === 'jpg' || p.filetype === 'jpeg' || p.filetype === 'png' || !p.filetype)
    );
    if (results.length === 0) throw new Error(`Openverse: sin fotos para "${keyword}"`);
    const picked = results[Math.floor(Math.random() * Math.min(8, results.length))];
    usedUrls.add(picked.id);
    console.log(`[Openverse] ✅ "${picked.title || picked.id}"`);
    return await downloadPhoto(picked.url, outputPath);
}

// 3. WIKIMEDIA COMMONS — Fotos dominio público, sin registro
async function searchWikimediaPhoto(keyword, outputPath, usedUrls = new Set()) {
    console.log(`[Wikimedia] 🖼️ Buscando: "${keyword}"`);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1080&format=json&gsrlimit=15`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': 'GodzillaStudio/1.0 (contact@godzillaconsulting.ai)' } });
    if (!res.ok) throw new Error(`Wikimedia API error: ${res.status}`);
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    const valid = pages.filter(p => {
        const info = p.imageinfo?.[0];
        if (!info?.url) return false;
        const u = info.url.toLowerCase();
        return (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png')) && !usedUrls.has(p.pageid);
    });
    if (valid.length === 0) throw new Error(`Wikimedia: sin fotos para "${keyword}"`);
    const picked = valid[Math.floor(Math.random() * Math.min(8, valid.length))];
    usedUrls.add(picked.pageid);
    const info = picked.imageinfo[0];
    console.log(`[Wikimedia] ✅ ${picked.title}`);
    return await downloadPhoto(info.thumburl || info.url, outputPath);
}

// 4. LOREMFLICKR — Fotos CC Flickr, sin registro
async function searchLoremflickrPhoto(keyword, outputPath, usedUrls = new Set()) {
    const safeKw = keyword.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(',');
    const seed = Math.floor(Math.random() * 10000);
    const imgUrl = `https://loremflickr.com/1080/1920/${encodeURIComponent(safeKw)}?lock=${seed}`;
    console.log(`[Loremflickr] 🖼️ ${imgUrl}`);
    return await downloadPhoto(imgUrl, outputPath);
}

// 5. PEXELS VIDEO (si se configura la key)
async function searchPexelsVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY no configurada');
    const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&orientation=portrait&size=medium&per_page=15`,
        { headers: { Authorization: apiKey } }
    );
    if (!res.ok) throw new Error(`Pexels Video API: ${res.status}`);
    const data = await res.json();
    const videos = (data.videos || []).filter(v => v.duration > 5 && v.duration < 120 && !usedUrls.has(v.url));
    if (videos.length === 0) throw new Error('Sin resultados Pexels Video');
    const picked = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
    usedUrls.add(picked.url);
    const files = picked.video_files || [];
    const portrait = files.filter(f => f.width < f.height).sort((a, b) => b.width - a.width);
    const best = (portrait.length > 0 ? portrait : files.sort((a, b) => b.width - a.width))[0];
    if (!best?.link) throw new Error('Sin URL de video Pexels');
    console.log(`[Pexels Video] ✅ ${picked.id} | ${best.width}x${best.height}`);
    return await downloadAndTrimVideo(best.link, outputPath, targetDuration);
}

// 6. PIXABAY VIDEO (si se configura la key)
async function searchPixabayVideo(keyword, outputPath, targetDuration, usedUrls = new Set()) {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error('PIXABAY_API_KEY no configurada');
    const res = await fetch(`https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(keyword)}&video_type=film&per_page=15`);
    if (!res.ok) throw new Error(`Pixabay Video API: ${res.status}`);
    const data = await res.json();
    const videos = (data.hits || []).filter(v => v.duration > 5 && v.duration < 120 && !usedUrls.has(v.pageURL));
    if (videos.length === 0) throw new Error('Sin resultados Pixabay Video');
    const picked = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
    usedUrls.add(picked.pageURL);
    const vs = picked.videos;
    const videoUrl = vs?.large?.url || vs?.medium?.url || vs?.small?.url;
    if (!videoUrl) throw new Error('Sin URL Pixabay Video');
    console.log(`[Pixabay Video] ✅ ${picked.id} | ${picked.duration}s`);
    return await downloadAndTrimVideo(videoUrl, outputPath, targetDuration);
}

// 7. PEXELS FOTO (si se configura la key)
async function searchPexelsPhoto(keyword, outputPath, usedUrls = new Set()) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY no configurada');
    const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&orientation=portrait&size=large&per_page=15`,
        { headers: { Authorization: apiKey } }
    );
    if (!res.ok) throw new Error(`Pexels Photo API: ${res.status}`);
    const data = await res.json();
    const photos = (data.photos || []).filter(p => !usedUrls.has(p.url));
    if (photos.length === 0) throw new Error('Sin resultados Pexels Foto');
    const picked = photos[Math.floor(Math.random() * Math.min(8, photos.length))];
    usedUrls.add(picked.url);
    const imgUrl = picked.src?.portrait || picked.src?.large;
    if (!imgUrl) throw new Error('Sin URL de foto Pexels');
    console.log(`[Pexels Foto] ✅ ${picked.id}`);
    return await downloadPhoto(imgUrl, outputPath);
}

// Cascada multi-fuente de stock
async function fetchStockMedia(keyword, outputVideoPath, targetDuration, usedUrls = new Set()) {
    const short = keyword.split(' ').slice(0, 4).join(' ');
    const photoOut = outputVideoPath.replace('.mp4', '_photo.jpg');

    // Nivel 1: Videos gratis
    for (const kw of [keyword, short]) {
        try { return { path: await searchCoverrVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
        catch(e) { console.log(`[Stock] Coverr falló ("${kw}"): ${e.message}`); }
    }
    if (process.env.PEXELS_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPexelsVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
            catch(e) { console.log(`[Stock] Pexels Video falló ("${kw}"): ${e.message}`); }
        }
    }
    if (process.env.PIXABAY_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPixabayVideo(kw, outputVideoPath, targetDuration, usedUrls), type: 'video' }; }
            catch(e) { console.log(`[Stock] Pixabay Video falló ("${kw}"): ${e.message}`); }
        }
    }

    // Nivel 2: Fotos gratis para Ken Burns slideshow
    console.log(`[Stock] Sin video. Buscando fotos para Ken Burns slideshow...`);
    /* Deshabilitados por baja calidad
    for (const kw of [keyword, short]) {
        try { return { path: await searchOpenversePhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(`[Stock] Openverse falló ("${kw}"): ${e.message}`); }
    }
    for (const kw of [keyword, short]) {
        try { return { path: await searchWikimediaPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(`[Stock] Wikimedia falló ("${kw}"): ${e.message}`); }
    }
    */
    if (process.env.PEXELS_API_KEY) {
        for (const kw of [keyword, short]) {
            try { return { path: await searchPexelsPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
            catch(e) { console.log(`[Stock] Pexels Foto falló ("${kw}"): ${e.message}`); }
        }
    }
    /* Deshabilitado por baja calidad
    for (const kw of [keyword, short]) {
        try { return { path: await searchLoremflickrPhoto(kw, photoOut, usedUrls), type: 'photo' }; }
        catch(e) { console.log(`[Stock] Loremflickr falló ("${kw}"): ${e.message}`); }
    }
    */

    // Nivel 3: Fallback final
    console.log(`[Stock] ⚠️ Todas las fuentes fallaron. Usando Google Imagen IA...`);
    throw new Error('NO_STOCK_FOUND');
}

// Mantener compatibilidad retroactiva
async function extractYoutubeStock(keyword, outputPath, targetDuration = 4, usedUrls = new Set()) {
    throw new Error('YouTube scraping deshabilitado. Use fetchStockMedia() en su lugar.');
}
async function extractSocialStock(keyword, outputPath, platform = 'pexels', targetDuration = 4, usedUrls = new Set()) {
    throw new Error('Social scraping deshabilitado. Use fetchStockMedia() en su lugar.');
}
async function generateVeoVideo(prompt, outputPath) {
    throw new Error(`Generación Veo deshabilitada temporalmente para ahorrar 400+ MXN.`);
}

// ── EFECTOS DE MOVIMIENTO (KEN BURNS) Y SLIDESHOWS ────────────────────────────

// Convierte una imagen estática a un clip de video 9:16 con efecto Ken Burns (zoom/paneo centrado o tercio superior/rostros)
async function imageToKenBurnsVideo(imgPath, duration, outputPath) {
    const fps = 30;
    const frames = Math.ceil(duration * fps);
    
    // Direcciones de zoom/paneo centrado / tercio superior (rostros) y escala máx 1.35 (zoom acelerado a 0.0025)
    const directions = [
        // Zoom in al centro
        `zoompan=z='min(zoom+0.0025,1.35)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`,
        // Zoom in tercio superior (rostros)
        `zoompan=z='min(zoom+0.0025,1.35)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)/3':d=${frames}:s=1080x1920:fps=${fps}`,
        // Zoom out desde el centro
        `zoompan=z='max(1.35-0.0025*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`,
        // Zoom out desde el tercio superior (rostros)
        `zoompan=z='max(1.35-0.0025*on,1.0)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)/3':d=${frames}:s=1080x1920:fps=${fps}`
    ];
    
    const filter = directions[Math.floor(Math.random() * directions.length)];
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imgPath)
            .inputOptions(['-loop 1'])
            .outputOptions([
                `-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${filter},setsar=1`,
                `-t ${duration}`,
                '-c:v libx264',
                '-preset ultrafast',
                '-pix_fmt yuv420p',
                '-r 30',
                '-an'
            ])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject);
    });
}

// Crea un slideshow concatenando múltiples clips con zoom individual (cada uno de exactamente 3.0 segundos)
async function buildSlideshowWithTransitions(imagePaths, totalDuration, outputPath) {
    const numImages = imagePaths.length;
    const segmentDuration = 3.0;
    const numClips = Math.ceil(totalDuration / segmentDuration);
    const clips = [];
    
    try {
        for (let idx = 0; idx < numClips; idx++) {
            const imgPath = imagePaths[idx % numImages];
            const clipOut = outputPath.replace('.mp4', `_kb_temp_${idx}.mp4`);
            await imageToKenBurnsVideo(imgPath, segmentDuration, clipOut);
            clips.push(clipOut);
        }
        
        // Concatenar clips usando FFmpeg concat demuxer
        const concatTxtPath = outputPath.replace('.mp4', '_concat.txt');
        const fileContent = clips.map(file => `file '${path.resolve(file).replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(concatTxtPath, fileContent);
        
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatTxtPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .save(outputPath)
                .on('end', resolve)
                .on('error', reject);
        });
        
        // Limpiar temporales
        if (fs.existsSync(concatTxtPath)) fs.unlinkSync(concatTxtPath);
        clips.forEach(c => {
            if (fs.existsSync(c)) fs.unlinkSync(c);
        });
    } catch (err) {
        clips.forEach(c => {
            if (fs.existsSync(c)) try { fs.unlinkSync(c); } catch(e){}
        });
        throw err;
    }
}

function timestampToSeconds(timestamp) {
    if (!timestamp) return 0;
    const parts = timestamp.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

async function downloadBackgroundMusic(outputPath) {
    console.log(`[MusicScraper] Buscando música de fondo libre de derechos...`);
    try {
        const queries = [
            'royalty free background music upbeat 3 minutes',
            'upbeat background music no copyright 3 minutes',
            'no copyright instrumental background music for videos'
        ];
        const keyword = queries[Math.floor(Math.random() * queries.length)];
        const r = await ytSearch(keyword);
        if (r.videos.length === 0) throw new Error("No music found");
        
        const getDuration = (v) => {
            return v.seconds || (v.duration && v.duration.seconds) || timestampToSeconds(v.duration && v.duration.timestamp) || timestampToSeconds(v.timestamp) || 0;
        };

        const shortVideos = r.videos.filter(v => {
            const sec = getDuration(v);
            return sec > 30 && sec < 600;
        });

        let videosToChoose = shortVideos;
        if (videosToChoose.length === 0) {
            const sorted = [...r.videos].sort((a, b) => getDuration(a) - getDuration(b));
            videosToChoose = sorted.filter(v => {
                const sec = getDuration(v);
                return sec > 10 && sec < 900;
            });
            if (videosToChoose.length === 0 && sorted.length > 0) {
                const shortestSec = getDuration(sorted[0]);
                if (shortestSec < 1200) {
                    videosToChoose = [sorted[0]];
                }
            }
        }

        if (videosToChoose.length === 0) {
            throw new Error("No suitable short background music videos found (all are too long)");
        }

        const video = videosToChoose[Math.floor(Math.random() * Math.min(3, videosToChoose.length))];
        
        console.log(`[MusicScraper] Seleccionada música: ${video.title} (${(video.duration && video.duration.timestamp) || video.timestamp || 'unknown'}, ${video.url})`);
        await youtubedl(video.url, {
            output: outputPath,
            format: 'bestaudio/best',
            extractAudio: true,
            audioFormat: 'mp3',
            noWarnings: true,
            ffmpegLocation: path.dirname(ffmpegPath.path)
        });
        console.log(`[MusicScraper] ✅ Música lista: ${outputPath}`);
        return outputPath;
    } catch(e) {
        console.error(`[MusicScraper] Error:`, e.message);
        return null;
    }
}

async function processTask() {
    if (isProcessing) return;
    
    let currentTaskId = null;
    try {
        isProcessing = true;
        
        // Tomar la siguiente tarea de la cola en estados pending_render_docker y bloquearla
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'rendering_docker'
            WHERE id = (
                SELECT id FROM studio_tasks 
                WHERE status IN ('pending_render', 'pending_render_docker') 
                ORDER BY created_at ASC LIMIT 1
            )
            RETURNING *;
        `);

        if (res.rowCount === 0) {
            isProcessing = false;
            return;
        }

        const task = res.rows[0];
        currentTaskId = task.id;
        console.log(`\n[MediaWorker] 🚀 Iniciando ensamblaje para Tarea #${task.id}: ${task.title}`);
        await sendProgress(task.id, 5, "Iniciando ensamblaje");

        let payload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
        if (Array.isArray(payload) && payload.length > 0) payload = payload[0];
        
        if (!payload || !payload.scenes) {
            throw new Error('El payload no contiene escenas estructuradas.');
        }

        // --- DETECT REFERENCE IMAGE/VIDEO AND EXTRACT BYTES ---
        let refImageBytes = null;
        let refMimeType = 'image/jpeg';
        let extractedStylePrompt = '';

        if (payload.refImage && typeof payload.refImage === 'string') {
            try {
                console.log(`[MediaWorker] 🔍 Reference file detected: ${payload.refImage}. Processing bytes...`);
                // 1. Check if it's a database file
                const match = payload.refImage.match(/\/file\/(\d+)/);
                if (match) {
                    const fileId = match[1];
                    const dbRes = await pool.query('SELECT file_data, mimetype FROM media_storage WHERE id = $1', [fileId]);
                    if (dbRes.rows.length > 0) {
                        refImageBytes = dbRes.rows[0].file_data.toString('base64');
                        refMimeType = dbRes.rows[0].mimetype;
                    }
                } 
                // 2. Check if it's a local video asset
                else if (payload.refImage.match(/\/assets\/(.+)/)) {
                    const filename = payload.refImage.match(/\/assets\/(.+)/)[1];
                    const cleanFilename = filename.split('?')[0];
                    const localPath = path.join('E:/assets', cleanFilename);
                    if (fs.existsSync(localPath)) {
                        console.log(`[MediaWorker] 🎥 Extracting middle frame from reference video: ${localPath}`);
                        const tempFramePath = path.join(os.tmpdir(), `task_${task.id}_ref_frame.jpg`);
                        await new Promise((resolve, reject) => {
                            ffmpeg(localPath)
                                .screenshots({
                                    timestamps: ['50%'],
                                    filename: path.basename(tempFramePath),
                                    folder: path.dirname(tempFramePath),
                                    size: '1080x1920'
                                })
                                .on('end', resolve)
                                .on('error', reject);
                        });
                        
                        if (fs.existsSync(tempFramePath)) {
                            refImageBytes = fs.readFileSync(tempFramePath).toString('base64');
                            refMimeType = 'image/jpeg';
                            try { fs.unlinkSync(tempFramePath); } catch(err){}
                        }
                    }
                }
                // 3. Check if it's base64 inline data
                else if (payload.refImage.startsWith('data:')) {
                    refMimeType = payload.refImage.split(';')[0].split(':')[1];
                    refImageBytes = payload.refImage.split(',')[1];
                }
            } catch (err) {
                console.warn(`[MediaWorker] ⚠️ Failed to extract reference file bytes:`, err.message);
            }
        }

        // --- 1. DYNAMIC FEEDBACK NOTES CORRECTIONS VIA GEMINI ---
        if (task.feedback_notes && task.feedback_notes.trim().length > 0) {
            try {
                console.log(`[MediaWorker] 🔄 feedback_notes detected: "${task.feedback_notes}". Adjusting script via Gemini...`);
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                
                const systemPrompt = `You are a professional AI video editor. You are given the current video script payload (containing narration scenes and visual prompts) and user feedback/corrections notes.
Your task is to modify the script (narration, visual prompts, and settings) to perfectly implement the user's feedback.

Current Script:
${JSON.stringify(payload.scenes, null, 2)}

User Feedback Notes:
${task.feedback_notes}

Instructions:
1. If the feedback is about the visual style or images, rewrite the visual prompts to reflect the feedback.
2. If the feedback is about the narration, rewrite the narration text.
3. Keep the JSON structure exactly identical to the original script (either a dictionary of keys like {"NARRACION ESCENA 1": "...", "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "..."} or an array of scenes).
4. Respond ONLY with the valid JSON object representing the updated script. Do not include markdown code block formatting (like \`\`\`json), just the raw JSON text.`;

                const rewriteParts = [{ text: systemPrompt }];
                if (refImageBytes) {
                    rewriteParts.push({ text: "Use the attached reference image as a style and visual reference for the corrections." });
                    rewriteParts.push({ inlineData: { mimeType: refMimeType, data: refImageBytes } });
                }

                const rewriteRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: rewriteParts }]
                });
                
                let rawText = rewriteRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                
                if (rawText.startsWith('{') || rawText.startsWith('[')) {
                    const newScenes = JSON.parse(rawText);
                    payload.scenes = newScenes;
                    console.log(`[MediaWorker] ✅ Script successfully updated with user feedback!`);
                    
                    // Save updated scenes back to the database in media_payload, and clear feedback_notes to avoid re-run loops
                    await pool.query(
                        `UPDATE studio_tasks SET media_payload = $1, feedback_notes = NULL WHERE id = $2`,
                        [JSON.stringify(payload), task.id]
                    );
                } else {
                    console.warn(`[MediaWorker] ⚠️ Gemini response was not valid JSON:\n${rawText}`);
                }
            } catch (err) {
                console.error(`[MediaWorker] ❌ Failed to rewrite script with feedback:`, err.message);
            }
        }

        // --- 2. EXTRACT STYLE FROM REFERENCE IMAGE ---
        if (refImageBytes) {
            try {
                console.log(`[MediaWorker] 🤖 Analyzing style of reference image via Gemini 2.5 Flash...`);
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const analysisRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: "Analyze this reference image. Provide a highly detailed description of its artistic style, color palette, lighting, mood, camera shot, and visual atmosphere. Focus on specific instructions that can be appended to other prompts to generate new images in this exact style. Keep it under 60 words and respond only with the descriptive style text in English." },
                                { inlineData: { mimeType: refMimeType, data: refImageBytes } }
                            ]
                        }
                    ]
                });
                const text = analysisRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text.trim().length > 10) {
                    extractedStylePrompt = text.trim();
                    console.log(`[MediaWorker] 🎨 Extracted style reference from Gemini:\n"${extractedStylePrompt}"`);
                }
            } catch (err) {
                console.warn(`[MediaWorker] ⚠️ Failed to extract style from reference:`, err.message);
            }
        }

        const isArrayFormat = Array.isArray(payload.scenes);
        const dayData = payload.scenes;
        
        const fallbackVoices = process.env.ELEVENLABS_API_KEY 
            ? ['elevenlabs:ODO4sbmD3pTjhgRVVRP6', 'elevenlabs:tTQzD8U9VSnJgfwC6HbY', 'elevenlabs:J4vZAFDEcpenkMp3f3R9', 'elevenlabs:9Godp7dNohUvXk6qp0gS'] 
            : ['edge:es-MX-JorgeNeural', 'edge:es-MX-DaliaNeural', 'edge:es-ES-AlvaroNeural', 'edge:es-ES-ElviraNeural', 'edge:es-AR-TomasNeural'];
        
        let selectedVoice = payload.voice;
        
        // Si no se definió o es 'Automático', seleccionamos de los fallbacks o ElevenLabs
        if (!selectedVoice || selectedVoice === 'Automático') {
            selectedVoice = fallbackVoices[task.id % fallbackVoices.length];
            if (process.env.ELEVENLABS_API_KEY && !selectedVoice.startsWith('elevenlabs:')) {
                const elevenVoices = ['elevenlabs:ODO4sbmD3pTjhgRVVRP6', 'elevenlabs:tTQzD8U9VSnJgfwC6HbY', 'elevenlabs:J4vZAFDEcpenkMp3f3R9', 'elevenlabs:9Godp7dNohUvXk6qp0gS'];
                selectedVoice = elevenVoices[task.id % elevenVoices.length];
                console.log(`[MediaWorker] 🎙️ ElevenLabs disponible y voz en automático. Usando ElevenLabs: ${selectedVoice}`);
            }
        } else {
            console.log(`[MediaWorker] 🎙️ Voz explícitamente seleccionada por usuario: ${selectedVoice}`);
        }

        const clipsPaths = [];
        const sceneCount = isArrayFormat ? dayData.length : (payload.sceneCount || 5);
        let usedVideoUrls = new Set();

        // Generar recursos por escena
        for (let i = 1; i <= sceneCount; i++) {
            let visualPrompt, videoPrompt, narration;
            
            if (isArrayFormat) {
                const scene = dayData[i - 1];
                visualPrompt = scene.visual || scene.visual_prompt;
                videoPrompt = scene.video || scene.video_prompt;
                narration = scene.narration;
            } else {
                visualPrompt = dayData[`VISUAL ESCENA ${i} (Prompt Imagen Detallado)`] || dayData[`VISUAL ESCENA ${i}`];
                videoPrompt = dayData[`VIDEO ESCENA ${i} (Prompt Movimiento Detallado)`] || dayData[`VIDEO ESCENA ${i}`];
                narration = dayData[`NARRACION ESCENA ${i} (CTA)`] || dayData[`NARRACION ESCENA ${i}`];
            }
            
            if (!visualPrompt && !videoPrompt && !narration) continue;

            const scenePercent = Math.floor(10 + ((i - 1) / sceneCount) * 80);
            await sendProgress(task.id, scenePercent, `Procesando Escena ${i} de ${sceneCount}`);
            console.log(`[MediaWorker] Procesando Escena ${i} (voz: ${selectedVoice})...`);
            const sceneImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.jpg`);
            const sceneVidPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_broll.mp4`);
            const sceneAudioPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.mp3`);
            
            let assPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.ass`);
            const slideshowPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_slideshow.mp4`);

            let targetDuration = 4;
            
            // 1. Generar la voz primero para saber la duración exacta
            if (narration) {
                if (fs.existsSync(sceneAudioPath)) {
                    console.log(`[MediaWorker] ♻️ Reutilizando audio de voz existente para Escena ${i}`);
                } else {
                    await generateVoice(narration, sceneAudioPath, selectedVoice, payload.referenceAudio).catch(e => null);
                }
                if (fs.existsSync(sceneAudioPath)) {
                    try {
                        const durStr = await new Promise((resolve, reject) => {
                            ffmpeg.ffprobe(sceneAudioPath, (err, metadata) => {
                                if (err) reject(err);
                                else resolve(metadata.format.duration);
                            });
                        });
                        targetDuration = Math.ceil(parseFloat(durStr));
                        console.log(`[MediaWorker] Duración de audio de escena ${i}: ${targetDuration}s`);
                    } catch (e) {
                        console.error("[MediaWorker] Error obteniendo duración de audio:", e.message);
                    }
                }
            }
            
            const randomStockName = STOCK_VIDEOS[Math.floor(Math.random() * STOCK_VIDEOS.length)].split('/').pop();
            const randomStock = path.resolve(process.cwd(), 'stock_videos', randomStockName || '853889-hd_1920_1080_25fps.mp4'); 
            
            let finalImgPath = sceneImgPath;
            let isFaceless = false;

            // 2. Obtener el medio visual (Bypass de videos de stock - Generación de imágenes IA en formato diapositiva/slideshow de 3s)
            if (fs.existsSync(slideshowPath)) {
                console.log(`[MediaWorker] ♻️ Reutilizando slideshow existente para Escena ${i}: ${slideshowPath}`);
                finalImgPath = slideshowPath;
                isFaceless = true;
            } else if (videoPrompt || visualPrompt) {
                try {
                    const googleImgPath = sceneImgPath;
                    const imgPrompt = (videoPrompt || visualPrompt || task.title).substring(0, 300);
                    
                    console.log(`[MediaWorker] Generando imágenes directamente vía Google Imagen AI con prompt: "${imgPrompt}" (duración target: ${targetDuration}s)`);
                    
                    const durationPerImg = 3.0;
                    const numImages = Math.max(1, Math.ceil(targetDuration / durationPerImg));
                    const imagePaths = [];
                    
                    for (let j = 0; j < numImages; j++) {
                        const tempImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_temp_${j}.jpg`);
                        imagePaths.push(tempImgPath);
                        const seed = Math.floor(Math.random() * 1000000);
                        let themeSuffix = ', highly realistic professional photography, lifelike details, sharp focus, vibrant colors, no watermark, no text overlays, clean image, high-fidelity photo';
                        
                        let sportsAdditions = '';
                        const lowerPrompt = imgPrompt.toLowerCase();
                        if (lowerPrompt.includes('cruz azul') || lowerPrompt.includes('soccer') || lowerPrompt.includes('futbol') || lowerPrompt.includes('football') || lowerPrompt.includes('liga mx') || lowerPrompt.includes('pumas')) {
                            themeSuffix = ', highly realistic professional sports photography, action shot, lifelike details, vivid team colors, stadium lights, no watermark, no text overlays, clean image, high-fidelity sports photo';
                            
                            // Inyección de precisión para uniformes y escudos reales
                            if (lowerPrompt.includes('cruz azul')) {
                                sportsAdditions = ' The players must wear the official Cruz Azul home kit: a royal blue jersey, white shorts, and blue socks. The jersey must feature the Cruz Azul crest: a blue cross inside a white circle, set against a red square. The stadium has intense blue and white crowd flags.';
                            }
                            if (lowerPrompt.includes('pumas') || lowerPrompt.includes('unam')) {
                                sportsAdditions = ' The players must wear the official Pumas UNAM kit: a dark blue and gold jersey, with the famous large stylized golden puma face emblem displayed prominently on the front of the shirt. The background is Estadio Olímpico Universitario.';
                            }
                        }
                        
                        let varPrompt = `${imgPrompt}${sportsAdditions}${themeSuffix}`;
                        if (extractedStylePrompt) {
                            varPrompt = `${imgPrompt}${sportsAdditions}. In the exact artistic style of: ${extractedStylePrompt}. ${themeSuffix}`;
                        }
                        varPrompt = `${varPrompt}, angle variation ${j + 1}, seed ${seed}`;
                        
                        // Esperar 1500ms entre llamadas de Google Imagen para evitar errores 429
                        if (j > 0) {
                            console.log(`[MediaWorker] Esperando 1500ms antes de llamar a Google Imagen...`);
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                        
                        try {
                            await generateGoogleImage(varPrompt, tempImgPath, '9:16');
                        } catch (err) {
                            console.error(`[MediaWorker] Falló Google Imagen ${j}:`, err.message);
                        }
                    }
                    
                    const existingImgPaths = imagePaths.filter(p => fs.existsSync(p));
                    if (existingImgPaths.length > 0) {
                        console.log(`[MediaWorker] Armando slideshow con ${existingImgPaths.length} fotos generadas por IA...`);
                        await buildSlideshowWithTransitions(existingImgPaths, targetDuration, slideshowPath);
                        existingImgPaths.forEach(p => {
                            if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch(err){}
                        });
                        
                        if (fs.existsSync(slideshowPath) && fs.statSync(slideshowPath).size > 5000) {
                            finalImgPath = slideshowPath;
                            isFaceless = true;
                            console.log(`[MediaWorker] ✅ Slideshow de Google Imagen listo: ${slideshowPath}`);
                        }
                    }
                } catch (googleErr) {
                    console.error(`[MediaWorker] Falló la generación del slideshow de Google Imagen:`, googleErr.message);
                }
            }

            if (!isFaceless || !fs.existsSync(finalImgPath)) {
                console.log(`[MediaWorker] 🔄 Fallback final a imagen local test_turbo.jpg...`);
                finalImgPath = path.resolve(process.cwd(), 'test_turbo.jpg');
                isFaceless = false;
            }

            let hasAss = false;

            if (fs.existsSync(sceneAudioPath)) {
                const jsonPath = sceneAudioPath + '.json';
                let cuesEs = buildSrtFromEdgeTtsJson(jsonPath);
                let cuesEn = [];

                if (cuesEs && cuesEs.length > 0) {
                    console.log(`[MediaWorker] 🎙️ Subtítulos sincronizados construidos con éxito a partir de JSON para Escena ${i}...`);
                    // Traducir los cues sincronizados conservando los mismos tiempos
                    const englishTexts = await translateCuesToEnglish(cuesEs);
                    cuesEn = cuesEs.map((cue, idx) => ({
                        text: englishTexts[idx] || cue.text,
                        start: cue.start,
                        end: cue.end
                    }));
                } else {
                    // Fallback lineal si no hay JSON
                    console.log(`[MediaWorker] ⚠️ No se encontró JSON de tiempos de EdgeTTS. Usando fallback lineal para Escena ${i}...`);
                    cuesEs = generateFallbackCues(narration, targetDuration);
                    
                    console.log(`[Translate] Traduciendo narración a inglés con Gemini...`);
                    const translatedNarration = await translateTextToEnglish(narration);
                    cuesEn = generateFallbackCues(translatedNarration, targetDuration);
                }

                if (cuesEs.length > 0 && cuesEn.length > 0) {
                    const assContent = generateAssSubtitles(cuesEn, cuesEs);
                    fs.writeFileSync(assPath, assContent);
                    hasAss = true;
                }
            }

            if (!hasAss) assPath = null;

            clipsPaths.push({ 
                img: finalImgPath, 
                audio: sceneAudioPath, 
                ass: assPath,
                id: i,
                isFaceless 
            });
        }

        if (clipsPaths.length === 0) {
            throw new Error('No se pudo generar ningún clip o audio para las escenas.');
        }

        const timestampId = Date.now();
        const finalOutputName = `task_${task.id}_final_${timestampId}.mp4`;
        const finalOutput = path.join(OUTPUT_DIR, finalOutputName);
        console.log(`[MediaWorker] 🎬 Ensamblando ${clipsPaths.length} escenas en: ${finalOutput}`);
        await sendProgress(task.id, 90, "Stitch con FFmpeg...");

        const renderedClips = [];
        for (let i = 0; i < clipsPaths.length; i++) {
            const clip = clipsPaths[i];
            const clipOut = path.join(OUTPUT_DIR, `task_${task.id}_clip_${i+1}.mp4`);
            renderedClips.push(clipOut);

            await new Promise((resolve, reject) => {
                const command = ffmpeg();
                
                const isPreBuiltSlideshow = clip.img.includes('_slideshow.mp4') || clip.img.includes('_broll.mp4');
                
                if (isPreBuiltSlideshow) {
                    command.input(clip.img);
                } else if (clip.isFaceless || clip.img.endsWith('.mp4')) {
                    command.input(clip.img).inputOptions(['-stream_loop', '-1']);
                } else {
                    command.input(clip.img).inputOptions(['-loop', '1', '-framerate', '30']);
                }

                const filterBase = (isPreBuiltSlideshow || clip.isFaceless)
                    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1`
                    : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0025,1.35)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1`;

                let vfStr = filterBase;
                if (clip.ass) {
                    const escapedAss = escapeSubtitlesPath(clip.ass);
                    vfStr += `,subtitles='${escapedAss}'`;
                }

                command.input(clip.audio)
                    .videoFilters(vfStr)
                    .outputOptions([
                        '-c:v libx264',
                        '-preset ultrafast',
                        '-threads 2',
                        '-crf 28',
                        '-c:a aac',
                        '-b:a 192k',
                        '-pix_fmt yuv420p',
                        '-r 30',
                        '-shortest'
                    ])
                    .on('start', function(commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    })
                    .save(clipOut)
                    .on('end', resolve)
                    .on('error', reject);
            });
        }

        const concatTxtPath = path.join(OUTPUT_DIR, `task_${task.id}_files.txt`);
        const fileContent = renderedClips.map(file => `file '${path.resolve(file).replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(concatTxtPath, fileContent);

        const tempFinalNoMusic = path.join(OUTPUT_DIR, `task_${task.id}_nomusic_${timestampId}.mp4`);
        await sendProgress(task.id, 92, "Ensamblando clips...");

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatTxtPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .save(tempFinalNoMusic)
                .on('end', resolve)
                .on('error', reject);
        });

        await sendProgress(task.id, 95, "Mezclando música de fondo...");
        const bgMusicPath = path.join(OUTPUT_DIR, `task_${task.id}_bgmusic.mp3`);
        const hasMusic = await downloadBackgroundMusic(bgMusicPath);

        if (hasMusic && fs.existsSync(bgMusicPath)) {
            await new Promise((resolve, reject) => {
                ffmpeg(tempFinalNoMusic)
                    .input(bgMusicPath)
                    .complexFilter([
                        '[0:a]volume=1.0[a1]',
                        '[1:a]volume=0.1[a2]',
                        '[a1][a2]amix=inputs=2:duration=first:dropout_transition=2[a]'
                    ])
                    .outputOptions([
                        '-map 0:v',
                        '-map [a]',
                        '-c:v copy',
                        '-c:a aac',
                        '-b:a 192k',
                        '-shortest'
                    ])
                    .save(finalOutput)
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else {
            fs.renameSync(tempFinalNoMusic, finalOutput);
        }

        // Limpiar temporales
        [concatTxtPath, tempFinalNoMusic, bgMusicPath, ...renderedClips, ...clipsPaths.flatMap(c => [c.img, c.audio, c.ass])].forEach(f => {
            if (f && fs.existsSync(f) && !f.includes('stock_videos')) {
                try { fs.unlinkSync(f); } catch(err){}
            }
        });

        console.log(`[MediaWorker] ✅ Video Final Completado: ${finalOutput}`);

        payload.url = `/outputs/${finalOutputName}`;
        
        await pool.query(`
            UPDATE studio_tasks 
            SET status = 'pending_cm_approval', assigned_to = 'auto', media_payload = $1, title = $2
            WHERE id = $3
        `, [JSON.stringify([payload]), task.title, task.id]);
        
        await sendProgress(task.id, 100, "¡Completado!");
        console.log(`[MediaWorker] Tarea #${task.id} marcada como lista para revisión del CEO.`);

    } catch (error) {
        console.error(`[MediaWorker] ❌ Error crítico:`, error.message);
        if (currentTaskId) {
            try {
                await pool.query(`UPDATE studio_tasks SET status = 'failed_docker' WHERE id = $1`, [currentTaskId]);
                await sendProgress(currentTaskId, 0, "Falló la generación");
                console.log(`[MediaWorker] Tarea #${currentTaskId} marcada como failed_docker.`);
            } catch (dbErr) {
                console.error(`[MediaWorker] ❌ Error al actualizar tarea a failed:`, dbErr.message);
            }
        }
    } finally {
        isProcessing = false;
    }
}

console.log('[MediaWorker] 🟢 Obrero de Medios iniciado. Escuchando base de datos cada 20 segundos...');
setInterval(processTask, 20000);
processTask();
