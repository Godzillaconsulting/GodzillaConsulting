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

// Helper: Traduce rutas de Windows a la estructura de directorios del contenedor Linux en Docker
function translatePathToContainer(filePath) {
    if (!filePath) return filePath;
    let cleanPath = filePath.replace(/\\/g, '/');
    if (process.platform === 'linux' && cleanPath.toLowerCase().includes('godzillaconsulting/')) {
        const parts = cleanPath.split(/godzillaconsulting\//i);
        if (parts.length > 1) {
            return path.join('/app', parts[1]);
        }
    }
    return filePath;
}

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

// Construye cues de subtítulos con tiempos reales del JSON de Edge TTS y los escala a la duración real
function buildSrtFromEdgeTtsJson(jsonPath, targetDurationSec, maxWords = 3, maxDurationMs = 1500) {
    if (!fs.existsSync(jsonPath)) return null;
    try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) return null;

        // Calculate scaling factor to match target duration (e.g., ElevenLabs audio duration)
        let scale = 1.0;
        if (targetDurationSec) {
            const edgeDurationMs = data[data.length - 1].end;
            if (edgeDurationMs > 0) {
                scale = (targetDurationSec * 1000) / edgeDurationMs;
                console.log(`[SRT] Scaling EdgeTTS timings by factor: ${scale.toFixed(4)} (Edge: ${(edgeDurationMs/1000).toFixed(2)}s -> Target: ${targetDurationSec.toFixed(2)}s)`);
            }
        }

        const cues = [];
        let currentWords = [];
        let currentStart = null;
        let currentEnd = null;

        for (let i = 0; i < data.length; i++) {
            const word = data[i];
            const text = word.part.trim();
            if (!text) continue;

            if (currentWords.length === 0) {
                currentStart = word.start * scale;
            }
            currentWords.push(text);
            currentEnd = word.end * scale;

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

// Analiza la imagen de referencia y genera múltiples prompts distintos utilizando Gemini 2.5 Flash
async function generateMultiplePromptsFromRef(refImageBytes, refMimeType, count, defaultPrompt) {
    if (!process.env.GEMINI_API_KEY) {
        return Array(count).fill(defaultPrompt);
    }
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log(`[GoogleImageGen] 🤖 Analizando imagen de referencia con Gemini para generar ${count} prompts distintos...`);
        
        const userMessage = `Analyze this reference image of a real soccer scene. Generate a JSON list containing exactly ${count} distinct and highly detailed prompt descriptions in English to be used by a text-to-image generator (like Imagen 4) to recreate different angles, moments, close-ups, or perspectives related to this scene.
        The prompts must be designed to generate images in a beautiful, premium, cinematic 3D cartoon animation style (similar to Pixar, DreamWorks, or Spider-Verse style, with clean shapes, highly expressive stylized character designs, vibrant team colors, and dramatic cinematic lighting).
        Focus on:
        1. Team uniforms (colors, shirts, shorts, specific circular crests or logos on the chest, stylized for animation).
        2. Stadium layout, colors of the concrete stands, and crowd flags, stylized in a clean cartoon style.
        3. Player physical descriptions (hair color, skin tone, expressive animated facial expressions, stylized body types) and action/composition.
        4. Cinematic animation lighting and camera details.
        
        Rules:
        - Do not name specific active soccer players directly to avoid safety blocks.
        - Do not include trademarked brand names, sponsor names, or specific text on the jerseys (such as 'DHL', 'Cemento Cruz Azul', 'novibet', 'Nike', etc.) to avoid safety blocks. Describe them conceptually (e.g. 'circular team crest', 'golden cat head emblem', 'brand logo').
        - Explicitly describe the scene as a "cinematic 3D cartoon illustration" or "vibrant animated sports scene" with clean lines.
        - Each prompt must be a standalone descriptive paragraph of 50-100 words.
        - Return ONLY a valid JSON array of strings. Do not include markdown code fences (like \`\`\`json), headers, or extra text.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: userMessage },
                        { inlineData: { mimeType: refMimeType, data: refImageBytes } }
                    ]
                }
            ]
        });
        
        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        let prompts = null;
        try {
            prompts = JSON.parse(cleanJson);
        } catch (parseErr) {
            console.warn(`[GoogleImageGen] JSON parsing failed. Attempting regex extraction...`);
            const matches = [...cleanJson.matchAll(/"([^"]+)"/g)];
            if (matches.length > 0) {
                prompts = matches.map(m => m[1]);
            }
        }
        if (Array.isArray(prompts) && prompts.length > 0) {
            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(prompts[i % prompts.length] || defaultPrompt);
            }
            console.log(`[GoogleImageGen] ✅ Generados ${result.length} prompts distintos con éxito.`);
            return result;
        }
    } catch (err) {
        console.warn(`[GoogleImageGen] ⚠️ Error generating multiple prompts from reference: ${err.message}. Using default prompts.`);
    }
    return Array(count).fill(defaultPrompt);
}

// Generación de imagen con Google Imagen 4 o Fallback a modelos Imagen 3.0 / 3.0 Fast con análisis multimodal previo si hay imagen de referencia.
async function generateGoogleImage(prompt, outputPath, aspect_ratio = '9:16', refImageBytes = null, refMimeType = 'image/jpeg') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let activePrompt = prompt;

    // Si hay una imagen de referencia, la analizamos con Gemini 2.5 Flash para extraer un prompt visual hiperdetallado
    if (refImageBytes) {
        try {
            console.log(`[GoogleImageGen] 🤖 Analizando imagen de referencia con Gemini 2.5 Flash para recreación exacta...`);
            const analysisRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: "Analyze this reference image of a real soccer scene. Describe it in extreme detail for a text-to-image generator (like Imagen 4) to recreate it as accurately as possible. Focus on: 1. The exact team uniforms (colors, shirts, shorts, specific circular crests or logos on the chest). 2. Stadium layout, colors of the concrete stands, and crowd flags. 3. Player physical descriptions (hair color, skin tone, general age, facial expression) and general action/composition. 4. Lighting and camera details. Do not name specific active soccer players directly to avoid safety blocks. Do not include any trademarked brand names, sponsor names, or specific text on the jerseys (such as 'DHL', 'Cemento Cruz Azul', 'novibet', 'Nike', etc.) to avoid safety blocks. Instead, describe them conceptually (e.g. 'a stylized cat emblem', 'a circular team crest', 'a brand logo'). Keep the description under 150 words and respond only with the descriptive English prompt text, no headers or extra commentary." },
                            { inlineData: { mimeType: refMimeType, data: refImageBytes } }
                        ]
                    }
                ]
            });
            const analyzedPrompt = analysisRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            if (analyzedPrompt.length > 20) {
                activePrompt = analyzedPrompt;
                console.log(`[GoogleImageGen] 📝 Prompt descriptivo generado por Gemini:\n"${activePrompt}"`);
            }
        } catch (analysisErr) {
            console.warn(`[GoogleImageGen] ⚠️ Análisis de imagen de referencia falló: ${analysisErr.message}. Usando prompt original.`);
        }
    }

    console.log(`[GoogleImageGen] Generando imagen para prompt: "${activePrompt.substring(0, 70)}..."`);

    // Intentamos en cascada sobre los modelos de Imagen soportados para lidiar con límites de cuota/429
    const models = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'];
    let imageBytes = null;

    for (const model of models) {
        try {
            console.log(`[GoogleImageGen] Intentando generar imagen con modelo: ${model}...`);
            const response = await ai.models.generateImages({
                model: model,
                prompt: activePrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspect_ratio === '9:16' ? '9:16' : '1:1'
                }
            });
            if (response.generatedImages?.[0]?.image?.imageBytes) {
                imageBytes = response.generatedImages[0].image.imageBytes;
                console.log(`[GoogleImageGen] ✅ Imagen generada con éxito usando ${model}.`);
                break;
            }
        } catch (err) {
            console.warn(`[GoogleImageGen] ⚠️ El modelo ${model} falló: ${err.message}`);
            // Si es un error de cuota/429, esperamos un momento antes de reintentar
            if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
                console.log(`[GoogleImageGen] Esperando 2 segundos debido a límite de cuota...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    if (imageBytes) {
        fs.writeFileSync(outputPath, Buffer.from(imageBytes, 'base64'));
        return outputPath;
    }

    throw new Error('GOOGLE_API_FAILED: No se pudo generar la imagen con Google GenAI (Límite de cuota o Prompt bloqueado por seguridad).');
}

// Funciones Open Source eliminadas por orden de exclusividad a Google APIs

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
                '-preset veryfast',
                '-crf 30',
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

async function downloadBackgroundMusic(outputPath, taskTitle = '', niche = '') {
    // Seleccionar query de música según el tema del video
    const combined = (taskTitle + ' ' + niche).toLowerCase();
    let musicQuery;
    if (/conspira|misterio|secreto|oculto|teor|filtrac|esc.ndalo|oscur/i.test(combined)) {
        const queries = [
            'dark mystery suspense background music no copyright',
            'cinematic dark thriller background music royalty free',
            'mysterious investigation music no copyright dark ambient',
            'suspense horror ambient music no copyright'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    } else if (/educa|aprende|c.mo|tips|gu.a|tutorial|datos|ciencia/i.test(combined)) {
        const queries = [
            'calm focus background music no copyright study',
            'chill lofi background music royalty free educational',
            'peaceful piano background music no copyright'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    } else if (/motiv|.xito|dinero|finanza|emprend|habit|negocio/i.test(combined)) {
        const queries = [
            'epic motivational background music no copyright',
            'uplifting cinematic background music royalty free',
            'powerful inspiring music no copyright business'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    } else if (/deporte|futbol|f.tbol|basket|sport|gym|fitness/i.test(combined)) {
        const queries = [
            'energetic sport background music no copyright',
            'hype trap sport music royalty free',
            'aggressive sport background music no copyright'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    } else if (/amor|romance|pareja|relaci.n|coraz.n/i.test(combined)) {
        const queries = [
            'romantic background music no copyright soft piano',
            'emotional love background music royalty free'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    } else {
        const queries = [
            'upbeat background music no copyright 3 minutes',
            'royalty free background music upbeat positive',
            'chill vibes background music no copyright'
        ];
        musicQuery = queries[Math.floor(Math.random() * queries.length)];
    }

    console.log(`[MusicScraper] 🎵 Buscando música temática: "${musicQuery}"`);
    try {
        const r = await ytSearch(musicQuery);
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
                if (shortestSec < 1200) videosToChoose = [sorted[0]];
            }
        }

        if (videosToChoose.length === 0) throw new Error("No suitable music videos found");

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

// DuckDuckGo HTML Search Scraper for Web Context Investigation
async function searchWebContext(query) {
    // Clean query: remove emojis, special symbols, keeping alphanumeric and spaces
    const cleanQuery = query.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ,-]/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`[Investigation] Searching Web Context for: "${cleanQuery}" (original: "${query}")`);
    
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        attempts++;
        try {
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
            const res = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(6000)
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const html = await res.text();
            const $ = cheerio.load(html);
            const snippets = [];
            $('.result__snippet').each((i, el) => {
                const text = $(el).text().trim();
                if (text && snippets.length < 5) {
                    snippets.push(text);
                }
            });
            const titles = [];
            $('.result__title').each((i, el) => {
                const text = $(el).text().trim();
                if (text && titles.length < 5) {
                    titles.push(text);
                }
            });
            
            let contextText = "";
            for (let i = 0; i < snippets.length; i++) {
                contextText += `[Source ${i+1}] Title: ${titles[i] || 'N/A'}\nSnippet: ${snippets[i]}\n\n`;
            }
            if (contextText) {
                return contextText;
            }
            throw new Error("Empty search results.");
        } catch (err) {
            console.error(`[Investigation] Attempt ${attempts}/${maxAttempts} failed:`, err.message);
            if (attempts >= maxAttempts) {
                return `Search failed: ${err.message}`;
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
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

        let payload = task.media_payload;
        while (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch(e) { break; }
        }
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
                const resolvedRefImagePath = translatePathToContainer(payload.refImage);
                console.log(`[MediaWorker] 🔍 Reference file detected: ${payload.refImage} (resolved: ${resolvedRefImagePath}). Processing bytes...`);
                // 1. Check if it's a database file
                const match = resolvedRefImagePath.match(/\/file\/(\d+)/);
                if (match) {
                    const fileId = match[1];
                    const dbRes = await pool.query('SELECT file_data, mimetype FROM media_storage WHERE id = $1', [fileId]);
                    if (dbRes.rows.length > 0) {
                        refImageBytes = dbRes.rows[0].file_data.toString('base64');
                        refMimeType = dbRes.rows[0].mimetype;
                    }
                } 
                // 2. Check if it's a local video asset
                else if (resolvedRefImagePath.match(/\/assets\/(.+)/)) {
                    const filename = resolvedRefImagePath.match(/\/assets\/(.+)/)[1];
                    const cleanFilename = filename.split('?')[0];
                    const localPath = path.join(process.env.ARCHIVOS_PESADOS_DIR || 'E:/assets', cleanFilename);
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
                else if (resolvedRefImagePath.startsWith('data:')) {
                    refMimeType = resolvedRefImagePath.split(';')[0].split(':')[1];
                    refImageBytes = resolvedRefImagePath.split(',')[1];
                }

         // --- 0. PRIOR WEB INVESTIGATION + REAL PHOTO SEARCH + SCRIPT UNIFICATION ---
        if (!payload.investigated) {
            try {
                console.log(`[MediaWorker] 🌐 Starting Prior Web Investigation for Task #${task.id}: "${task.title}"`);
                await sendProgress(task.id, 7, "Investigando contexto real y buscando fotos");
                
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

                // ── A. BUSCAR FOTO REAL DE PERSONAJES PÚBLICOS ────────────────────────────
                // Si no hay imagen de referencia, detectar personas conocidas y buscar su foto real
                if (!refImageBytes) {
                    try {
                        console.log(`[MediaWorker] 🔍 Detectando personajes públicos en el título...`);
                        const detectRes = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `Analiza este título de video: "${task.title}". ¿Menciona personas públicas conocidas (artistas, influencers, deportistas, políticos, personajes famosos)? Si sí, devuelve SOLO el nombre completo del personaje más relevante (el primero mencionado o el más buscado). Si no hay personas conocidas, devuelve exactamente: NONE. Solo el nombre o NONE, sin explicación.`
                        });
                        const detectedPerson = detectRes.text?.trim() || 'NONE';
                        
                        if (detectedPerson !== 'NONE' && detectedPerson.length > 2) {
                            console.log(`[MediaWorker] 👤 Personaje público detectado: "${detectedPerson}". Buscando foto real...`);
                            // Buscar foto en DuckDuckGo Images
                            const photoQuery = encodeURIComponent(`${detectedPerson} foto`);
                            const ddgImgUrl = `https://duckduckgo.com/?q=${photoQuery}&iax=images&ia=images&t=h_`;
                            const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${photoQuery}+site:instagram.com+OR+site:twitter.com`, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                                signal: AbortSignal.timeout(6000)
                            });
                            // Buscar directamente imágenes via DuckDuckGo API de imágenes
                            const imgApiUrl = `https://duckduckgo.com/i.js?q=${photoQuery}&o=json&s=0&u=bing&f=,,,,,&l=es-es`;
                            const imgRes = await fetch(imgApiUrl, {
                                headers: { 
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Referer': 'https://duckduckgo.com/'
                                },
                                signal: AbortSignal.timeout(8000)
                            });
                            if (imgRes.ok) {
                                const imgData = await imgRes.json();
                                const results = imgData.results || [];
                                // Filtrar imágenes de personas (JPG/PNG, tamaño razonable)
                                const validImgs = results.filter(r => 
                                    r.image && (r.image.endsWith('.jpg') || r.image.endsWith('.jpeg') || r.image.endsWith('.png') || r.image.includes('jpg') || r.image.includes('jpeg'))
                                    && r.width > 200 && r.height > 200
                                );
                                if (validImgs.length > 0) {
                                    // Intentar descargar la primera imagen válida
                                    for (const img of validImgs.slice(0, 5)) {
                                        try {
                                            const imgDownload = await fetch(img.image, {
                                                headers: { 'User-Agent': 'Mozilla/5.0' },
                                                signal: AbortSignal.timeout(8000)
                                            });
                                            if (imgDownload.ok) {
                                                const imgBuffer = await imgDownload.arrayBuffer();
                                                if (imgBuffer.byteLength > 10000) { // mínimo 10KB
                                                    refImageBytes = Buffer.from(imgBuffer).toString('base64');
                                                    refMimeType = imgDownload.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
                                                    if (!refMimeType.startsWith('image/')) refMimeType = 'image/jpeg';
                                                    console.log(`[MediaWorker] ✅ Foto real de "${detectedPerson}" descargada (${Math.round(imgBuffer.byteLength/1024)}KB) → se usará como referencia visual`);
                                                    break;
                                                }
                                            }
                                        } catch(dlErr) {
                                            console.warn(`[MediaWorker] ⚠️ No se pudo descargar imagen: ${dlErr.message}`);
                                        }
                                    }
                                }
                            }
                        }
                    } catch(photoErr) {
                        console.warn(`[MediaWorker] ⚠️ Búsqueda de foto real falló: ${photoErr.message}`);
                    }
                }

                // ── B. INVESTIGACIÓN WEB Y ENRIQUECIMIENTO ────────────────────────────────
                const searchQuery = `${task.title} ${payload.niche || ''}`.trim();
                const searchContext = await searchWebContext(searchQuery);
                console.log(`[MediaWorker] 🔎 Search context retrieved (${searchContext.length} chars). Enriching script...`);
                
                const enrichPrompt = `You are a professional AI video editor and research director.
We are creating a highly engaging social media video.
Your task is to enrich the current video script payload (narration scenes and visual prompts) using the provided web search context.

Current Script Payload:
${JSON.stringify(payload.scenes, null, 2)}

Web Search Context (Real-world facts, names, teams, colors, logos, stadiums, etc.):
${searchContext}

Instructions:
1. Research & Enrich: Rewrite the narration text and visual prompts to reflect real-world facts, names, and official aesthetics from the search context.
2. Safety & Policy Compliance: Avoid naming specific real active people directly in the visual prompts — describe them physically instead. Use real names only in narration text.
3. Quality: Keep the tone epic, viral, educational, and engaging.
4. Structure: Keep the JSON structure exactly identical to the original script.
5. Respond ONLY with the valid JSON object. No markdown fences.`;
                
                const rewriteRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: enrichPrompt }] }]
                });
                
                let rawText = rewriteRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                
                if (rawText.startsWith('{') || rawText.startsWith('[')) {
                    payload.scenes = JSON.parse(rawText);
                    payload.investigationContext = searchContext;
                    console.log(`[MediaWorker] ✅ Script successfully enriched with real-world facts!`);
                }

                payload.investigated = true;
                await pool.query(
                    `UPDATE studio_tasks SET media_payload = $1 WHERE id = $2`,
                    [JSON.stringify([payload]), task.id]
                );
            } catch (err) {
                console.error(`[MediaWorker] ❌ Failed prior web investigation:`, err.message);
            }
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

        const isArrayFormat = Array.isArray(payload.scenes) || (payload.scenes && Array.isArray(payload.scenes.scenes));
        let dayData = Array.isArray(payload.scenes) ? payload.scenes : (payload.scenes && Array.isArray(payload.scenes.scenes) ? payload.scenes.scenes : payload.scenes);
        
        // ── 3. UNIFICAR NARRACIÓN EN GUION ÚNICO SIN REPETICIONES ────────────────────
        // Aplica a TODOS los videos. Toma las narraciones por escena, las une, y pide a Gemini
        // que las reescriba como UNA sola historia progresiva de 60-90s y las redistribuye.
        if (process.env.GEMINI_API_KEY && !payload.narrationUnified) {
            try {
                console.log(`[MediaWorker] ✍️ Unificando narración en guion continuo sin repeticiones...`);
                await sendProgress(task.id, 9, "Escribiendo guion unificado");

                // Extraer todas las narraciones actuales
                let existingNarrations = '';
                const sceneCountForUnify = isArrayFormat ? dayData.length : (payload.sceneCount || 5);
                for (let si = 0; si < sceneCountForUnify; si++) {
                    let narr = '';
                    if (isArrayFormat) {
                        narr = dayData[si]?.narration || '';
                    } else {
                        narr = dayData[`NARRACION ESCENA ${si+1} (CTA)`] || dayData[`NARRACION ESCENA ${si+1}`] || '';
                    }
                    if (narr) existingNarrations += narr + ' ';
                }

                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

                // Detectar tipo de contenido para seleccionar el framework correcto
                const niche = (payload.niche || task.tags?.join(' ') || '').toLowerCase();
                const contentType = (task.content_type || '').toLowerCase();
                const isConspiracy = /conspira|misterio|secreto|oculto|teoría|viral|filtrac|escándalo/i.test(niche + task.title + contentType);
                const isEducational = /educa|aprende|cómo|tips|guía|tutorial|datos/i.test(niche + task.title + contentType);
                const isMotivational = /motiv|éxito|dinero|finanza|emprend|habit/i.test(niche + task.title + contentType);

                // Seleccionar framework según tipo
                let frameworkInstructions = '';
                let toneInstruction = '';

                if (isConspiracy) {
                    frameworkInstructions = `Usa el THRILLER ARC framework:
- SETUP (0-5s): Entra directo al misterio o contradicción. NUNCA empieces con "Hoy les voy a hablar de" o presentaciones genéricas. Drops us into the tension.
- INCITING INCIDENT (5-15s): El momento exacto en que todo cambió.
- UNRAVELING (15-55s): Frases cortas y contundentes. Usa narración tipo "y entonces descubrí algo que el informe oficial no mencionaba...". Re-engancha cada 15s con una nueva pregunta o revelación.
- CTA/OPEN LOOP (55-90s): Pregunta provocadora que genera comentarios. Deja algo sin resolver para que el espectador comente.`;
                    toneInstruction = `Tono: narrador de podcast de conspiraciones. Suspenso creciente. Urgente pero controlado. Como si estuvieras revelando algo peligroso.`;
                } else if (isEducational) {
                    frameworkInstructions = `Usa el framework AIDA + PAS:
- HOOK (0-3s): Pattern interrupt o número específico impactante. Ejemplo: "El 94% de los negocios fracasan por esto."
- PROBLEMA (3-15s): Describe el dolor exacto del espectador. Hazlo sentir identificado.
- AGITACIÓN (15-35s): Amplifica el costo emocional de ignorar este problema.
- SOLUCIÓN (35-55s): Presenta la solución clara, paso a paso, simple.
- CTA (55-75s): Un solo paso de acción, sin fricción.`;
                    toneInstruction = `Tono: mentor cercano, directo, sin academicismos. Como un amigo que sabe más que tú.`;
                } else if (isMotivational) {
                    frameworkInstructions = `Usa el framework PSP (Problem-Solution-Proof):
- HOOK (0-8s): Resultado impactante primero. "Este hombre ganó $40K en 30 días. Aquí está exactamente cómo."
- SOLUCIÓN (8-35s): Presenta el método claramente.
- PRUEBA (35-60s): Ejemplos reales, números, testimonios, evidencia.
- CTA (60-75s): Acción específica de un solo paso.`;
                    toneInstruction = `Tono: energético, inspirador, aspiracional. Velocidad rápida. Como un coach que ya lo logró.`;
                } else {
                    frameworkInstructions = `Usa el framework S.T.A.R.T.:
- STOP (0-3s): Hook que interrumpe el scroll. Usa curiosity gap o controversia.
- TARGET (3-10s): Conecta con el problema o deseo del espectador.
- ADD VALUE (10-40s): Desarrolla la historia con datos reales y ritmo cinematográfico.
- REINFORCE (40-55s): Refuerza con ejemplos o prueba.
- TAKE ACTION (55-75s): CTA claro y de fricción mínima.`;
                    toneInstruction = `Tono: periodístico, viral, dinámico. Frases cortas y contundentes.`;
                }

                const unifyRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Eres un guionista de nivel cine experto en contenido viral de formato corto (Reels/TikTok) en español.

TÍTULO: "${task.title}"
AUDIENCIA: adultos hispanohablantes 25-45 años
NARRACIÓN BASE (puede tener repeticiones/borrador): "${existingNarrations.trim()}"

${frameworkInstructions}

${toneInstruction}

REGLAS CINEMATOGRÁFICAS OBLIGATORIAS:
1. Oraciones máximo 12 palabras. Sin palabras de relleno ("básicamente", "entonces", "eh", "como que").
2. NUNCA repitas la misma idea en dos segmentos distintos.
3. Cada oración debe ser visualmente traducible (el espectador debe poder imaginar la imagen mientras escucha).
4. Usa HOOKS de alto impacto: curiosity gap, números específicos, o pattern interrupt.
5. Duración total: 60-90 segundos hablado (150-220 palabras máximo en total).
6. El PRIMER SEGMENTO debe comenzar con el hook más fuerte. NUNCA con introducción.

FORMATO DE RESPUESTA:
Divide en exactamente ${sceneCountForUnify} segmentos separados por "||ESCENA||"
Responde SOLO los segmentos. Sin numeración, sin encabezados, sin explicación extra.`
                });

                const unifiedText = unifyRes.text?.trim() || '';
                const segments = unifiedText.split('||ESCENA||').map(s => s.trim()).filter(s => s.length > 5);

                if (segments.length >= 2) {
                    // Redistribuir los segmentos en las escenas existentes
                    if (isArrayFormat) {
                        dayData = dayData.map((scene, idx) => ({
                            ...scene,
                            narration: segments[idx] || scene.narration
                        }));
                        if (Array.isArray(payload.scenes)) payload.scenes = dayData;
                    } else {
                        segments.forEach((seg, idx) => {
                            const key1 = `NARRACION ESCENA ${idx+1} (CTA)`;
                            const key2 = `NARRACION ESCENA ${idx+1}`;
                            if (dayData[key1] !== undefined) dayData[key1] = seg;
                            else if (dayData[key2] !== undefined) dayData[key2] = seg;
                        });
                    }
                    payload.narrationUnified = true;
                    console.log(`[MediaWorker] ✅ Guion unificado en ${segments.length} segmentos sin repeticiones.`);
                    await pool.query(
                        `UPDATE studio_tasks SET media_payload = $1 WHERE id = $2`,
                        [JSON.stringify([payload]), task.id]
                    );
                } else {
                    console.warn(`[MediaWorker] ⚠️ No se pudo unificar el guion (segmentos insuficientes: ${segments.length}). Usando original.`);
                }
            } catch (unifyErr) {
                console.warn(`[MediaWorker] ⚠️ Error al unificar narración: ${unifyErr.message}. Continuando con original.`);
            }
        }

        // Voz única estable — edge:es-MX-JorgeNeural
        const fallbackVoice = 'edge:es-MX-JorgeNeural';
        let selectedVoice = (payload.voice && payload.voice !== 'Automático' && payload.voice !== 'null' && payload.voice !== 'undefined')
            ? payload.voice
            : fallbackVoice;
        console.log(`[MediaWorker] 🎙️ Voz: ${selectedVoice}`);


        const clipsPaths = [];
        const sceneCount = isArrayFormat ? dayData.length : (payload.sceneCount || dayData.sceneCount || 5);
        let usedVideoUrls = new Set();
        const workerStartTime = Date.now();

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
            
            let etaStr = "";
            if (i > 1) {
                const elapsedMs = Date.now() - workerStartTime;
                const avgMs = elapsedMs / (i - 1);
                const remScenes = sceneCount - (i - 1);
                const remSecs = Math.round((remScenes * avgMs) / 1000);
                const m = Math.floor(remSecs / 60);
                const s = remSecs % 60;
                etaStr = ` (Faltan aprox ${m}m ${s}s)`;
            }

            await sendProgress(task.id, scenePercent, `Procesando Escena ${i} de ${sceneCount}${etaStr}`);
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
            
            let sceneRefImage = null;
            if (isArrayFormat) {
                const scene = dayData[i - 1];
                sceneRefImage = scene.refImage || scene.ref_image || scene.reference_image;
            } else {
                sceneRefImage = dayData[`REF_IMAGE ESCENA ${i}`] || dayData[`REFERENCE ESCENA ${i}`];
            }

            // Extraer bytes de imagen de referencia por escena si existe
            let sceneRefBytes = null;
            let sceneRefMime = 'image/jpeg';
            if (sceneRefImage && typeof sceneRefImage === 'string') {
                try {
                    const resolvedRefImagePath = translatePathToContainer(sceneRefImage);
                    console.log(`[MediaWorker] 🔍 Scene reference file detected: ${sceneRefImage} (resolved: ${resolvedRefImagePath}). Processing...`);
                    const match = resolvedRefImagePath.match(/\/file\/(\d+)/);
                    if (match) {
                        const fileId = match[1];
                        const dbRes = await pool.query('SELECT file_data, mimetype FROM media_storage WHERE id = $1', [fileId]);
                        if (dbRes.rows.length > 0) {
                            sceneRefBytes = dbRes.rows[0].file_data.toString('base64');
                            sceneRefMime = dbRes.rows[0].mimetype;
                        }
                    } 
                    else if (fs.existsSync(resolvedRefImagePath)) {
                        sceneRefBytes = fs.readFileSync(resolvedRefImagePath).toString('base64');
                        sceneRefMime = resolvedRefImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
                    }
                    else if (resolvedRefImagePath.startsWith('data:')) {
                        sceneRefMime = resolvedRefImagePath.split(';')[0].split(':')[1];
                        sceneRefBytes = resolvedRefImagePath.split(',')[1];
                    }
                } catch (err) {
                    console.warn(`[MediaWorker] ⚠️ Failed to extract scene reference bytes:`, err.message);
                }
            }

            let finalImgPath = sceneImgPath;
            let isFaceless = false;

            // 2. Obtener el medio visual (Bypass de videos de stock - Generación de imágenes IA en formato diapositiva/slideshow de 3s)
            if (fs.existsSync(slideshowPath)) {
                console.log(`[MediaWorker] ♻️ Reutilizando slideshow existente para Escena ${i}: ${slideshowPath}`);
                finalImgPath = slideshowPath;
                isFaceless = true;
            } else if (videoPrompt || visualPrompt) {
                try {
                    const sceneDescription = videoPrompt || visualPrompt || 'Cinematic shot';
                    const imgPrompt = `Theme context: ${task.title}. Scene details: ${sceneDescription}`;
                    
                    let sportsAdditions = '';
                    const lowerPrompt = imgPrompt.toLowerCase();
                    if (lowerPrompt.includes('cruz azul') || lowerPrompt.includes('soccer') || lowerPrompt.includes('futbol') || lowerPrompt.includes('football') || lowerPrompt.includes('liga mx') || lowerPrompt.includes('pumas')) {
                        // Inyección de precisión para uniformes y escudos reales
                        if (lowerPrompt.includes('cruz azul')) {
                            sportsAdditions = ' The players must wear the official Cruz Azul home kit: a royal blue jersey, white shorts, and blue socks. The jersey must feature the Cruz Azul crest: a blue cross inside a white circle, set against a red square. The stadium has intense blue and white crowd flags.';
                        }
                        if (lowerPrompt.includes('pumas') || lowerPrompt.includes('unam')) {
                            sportsAdditions = ' The players must wear the official Pumas UNAM kit: a dark blue and gold jersey, with the famous large stylized golden puma face emblem displayed prominently on the front of the shirt. The background is Estadio Olímpico Universitario.';
                        }
                    }
                    
                    let varPrompt = `${imgPrompt}${sportsAdditions}`;
                    if (extractedStylePrompt) {
                        varPrompt = `${imgPrompt}${sportsAdditions}. In the exact artistic style of: ${extractedStylePrompt}.`;
                    }

                    const durationPerImg = 8.0;
                    const numImages = Math.min(3, Math.max(1, Math.ceil(targetDuration / durationPerImg)));
                    console.log(`[MediaWorker] Generando ${numImages} imágenes para slideshow de la Escena ${i} (duración target: ${targetDuration}s)`);

                    let prompts = [];
                    if (sceneRefBytes) {
                        prompts = await generateMultiplePromptsFromRef(sceneRefBytes, sceneRefMime, numImages, varPrompt);
                    } else {
                        for (let j = 0; j < numImages; j++) {
                            const seed = Math.floor(Math.random() * 1000000);
                            prompts.push(`${varPrompt}, angle variation ${j + 1}, seed ${seed}`);
                        }
                    }

                    const imagePaths = [];
                    for (let j = 0; j < numImages; j++) {
                        const tempImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_temp_${j}.jpg`);
                        console.log(`[MediaWorker] Generando imagen ${j+1}/${numImages} para Escena ${i}...`);
                        try {
                            await generateGoogleImage(prompts[j], tempImgPath, '9:16');
                        } catch (imgErr) {
                            console.warn(`[MediaWorker] ⚠️ Imagen ${j+1} falló (${imgErr.message}), continuando con las demás...`);
                        }
                        if (fs.existsSync(tempImgPath)) {
                            imagePaths.push(tempImgPath);
                        }
                        // Esperar 1 segundo para evitar saturar el límite de cuota
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    if (imagePaths.length > 0) {
                        console.log(`[MediaWorker] Armando slideshow Ken Burns con ${imagePaths.length} imágenes...`);
                        await buildSlideshowWithTransitions(imagePaths, targetDuration, slideshowPath);
                        
                        // Eliminar las imágenes temporales
                        imagePaths.forEach(p => {
                            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch(e){}
                        });

                        if (fs.existsSync(slideshowPath) && fs.statSync(slideshowPath).size > 5000) {
                            finalImgPath = slideshowPath;
                            isFaceless = true;
                            console.log(`[MediaWorker] ✅ Slideshow de video listo: ${slideshowPath}`);
                        }
                    }
                } catch (googleErr) {
                    console.error(`[MediaWorker] Falló generación de imágenes Google, usando stock video como fallback:`, googleErr.message);
                    // FALLBACK: usar stock video en lugar de morir
                    if (fs.existsSync(randomStock)) {
                        finalImgPath = randomStock;
                        isFaceless = false;
                        console.log(`[MediaWorker] ✅ Usando stock video como fallback: ${randomStock}`);
                    }
                }
            }

            if (!fs.existsSync(finalImgPath)) {
                throw new Error(`Media generation failed. ${finalImgPath} does not exist.`);
            }

            let hasAss = false;

            if (fs.existsSync(sceneAudioPath)) {
                const jsonPath = sceneAudioPath + '.json';
                let cuesEs = buildSrtFromEdgeTtsJson(jsonPath, targetDuration);
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
                        '-preset veryfast',
                        '-threads 2',
                        '-crf 30',
                        '-c:a aac',
                        '-b:a 128k',
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
        const hasMusic = await downloadBackgroundMusic(bgMusicPath, task.title, payload.niche || '');

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
