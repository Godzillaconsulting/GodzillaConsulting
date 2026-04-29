import pool from '../config/db.js';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import fetch from 'node-fetch';
import { generateVoice } from '../services/ttsService.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import pkgWave from 'wavefile';
const { WaveFile } = pkgWave;

// Helper: Formato de tiempo para SRT
function formatSrtTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
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

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || path.join(process.cwd(), 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let isProcessing = false;

// La lógica de generación de voz fue extraída a server/services/ttsService.js

const STOCK_VIDEOS = [
  'https://cdn.coverr.co/videos/coverr-a-person-typing-on-a-laptop-5291/1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-person-counting-dollar-bills-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-walking-in-a-crowded-city-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-man-working-out-at-the-gym-1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-crypto-trading-1080p.mp4'
];

// Generación de imagen con Imagen 3 + Fallback a Pollinations Libre
async function generateImage(prompt, outputPath) {
    console.log(`[MediaWorker] Generando Imagen: "${prompt.substring(0, 30)}..."`);
    
    // Opción 1: Google Imagen 3
    if (process.env.GEMINI_API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const response = await ai.models.generateImages({
                model: 'imagen-3.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '9:16' }
            });
            
            if (response.generatedImages?.[0]?.image?.imageBytes) {
                const b64 = response.generatedImages[0].image.imageBytes;
                const buffer = Buffer.from(b64, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`[MediaWorker] ✅ Imagen generada (Google Imagen 3).`);
                return outputPath;
            }
        } catch (e) {
            console.warn(`[MediaWorker] ⚠️ Google Imagen 3 falló (${e.message}). Usando Fallback...`);
        }
    } else {
        console.warn(`[MediaWorker] ⚠️ GEMINI_API_KEY no detectada. Usando Fallback...`);
    }

    // Opción 2: Fallback Libre (Pollinations AI)
    console.log(`[MediaWorker] 🔄 Generando con motor de respaldo libre...`);
    const safePrompt = prompt.length > 300 ? prompt.substring(0, 300) : prompt;
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1080&height=1920&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
    
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`Fallo Fallback: ${res.statusText}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    console.log(`[MediaWorker] ✅ Imagen generada (Fallback Libre).`);
    return outputPath;
}

async function processTask() {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        
        // 1. Tomar la siguiente tarea de la cola y bloquearla inmediatamente
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'rendering'
            WHERE id = (
                SELECT id FROM studio_tasks 
                WHERE status = 'pending_cm_approval' AND assigned_to = 'test' 
                ORDER BY created_at ASC LIMIT 1
            )
            RETURNING *;
        `);

        if (res.rowCount === 0) {
            isProcessing = false;
            return; // Nada en cola
        }

        const task = res.rows[0];
        console.log(`\n[MediaWorker] 🚀 Iniciando ensamblaje para Tarea #${task.id}: ${task.title}`);

        const payload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
        
        if (!payload || !payload.scenes) {
            throw new Error('El payload no contiene escenas estructuradas.');
        }

        const dayData = payload.scenes;
        const selectedVoice = payload.voice || 'edge:es-MX-JorgeNeural';
        const clipsPaths = [];

        // Generaremos las imágenes + voz por cada escena
        for (let i = 1; i <= 5; i++) {
            const visualPrompt = dayData[`VISUAL ESCENA ${i} (Prompt Imagen Detallado)`];
            const narration = i === 5 ? dayData['NARRACION ESCENA 5 (CTA)'] : dayData[`NARRACION ESCENA ${i}`];
            
            if (!visualPrompt && !narration) continue;

            console.log(`[MediaWorker] Procesando Escena ${i} (voz: ${selectedVoice})...`);
            const sceneImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.png`);
            const sceneAudioPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.mp3`);
            
            // Generar Medios en Paralelo para agilizar
            const promises = [];
            
            // Para Videos Faceless, ALTERNAMOS: Escenas impares usan IA, Escenas pares usan Stock (o al revés)
            const isFaceless = (i % 2 === 0); // Escena 2, 4 serán Stock; 1, 3, 5 serán IA
            const randomStock = STOCK_VIDEOS[Math.floor(Math.random() * STOCK_VIDEOS.length)];

            if (!isFaceless && visualPrompt) {
                promises.push(generateImage(visualPrompt, sceneImgPath).catch(e => null));
            }

            if (narration) promises.push(generateVoice(narration, sceneAudioPath, selectedVoice, payload.referenceAudio).catch(e => null));
            
            await Promise.all(promises);

            let srtPath = null;
            if (fs.existsSync(sceneAudioPath)) {
                // Generar subtítulos quemados usando Whisper
                try {
                    console.log(`[MediaWorker] 🎙️ Generando Subtítulos con Whisper para Escena ${i}...`);
                    const { pipeline, env } = await import('@huggingface/transformers');
                    env.cacheDir = 'E:/Godzilla_Studio_Cache/models';
                    env.backends.onnx.wasm.numThreads = 2;
                    
                    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { dtype: 'fp32' });
                    
                    // Extraer WAV a 16kHz usando ffmpeg para Transformers.js
                    const tempWavPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_temp.wav`);
                    await new Promise((resolve, reject) => {
                        ffmpeg(sceneAudioPath)
                            .outputOptions(['-ar 16000', '-ac 1'])
                            .save(tempWavPath)
                            .on('end', resolve)
                            .on('error', reject);
                    });

                    let buffer = fs.readFileSync(tempWavPath);
                    let wav = new WaveFile(buffer);
                    wav.toBitDepth('32f');
                    wav.toSampleRate(16000);
                    let audioData = wav.getSamples();
                    if (Array.isArray(audioData)) audioData = audioData[0];

                    const output = await transcriber(audioData, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word' });
                    
                    if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);

                    if (output.chunks && output.chunks.length > 0) {
                        const srtContent = chunksToSRT(output.chunks);
                        srtPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.srt`);
                        fs.writeFileSync(srtPath, srtContent);
                    }
                } catch (err) {
                    console.error(`[MediaWorker] ⚠️ Error en Whisper para Escena ${i}:`, err.message);
                }

                clipsPaths.push({ 
                    img: isFaceless ? randomStock : sceneImgPath, 
                    audio: sceneAudioPath, 
                    srt: srtPath,
                    id: i,
                    isFaceless 
                });
            }
        }

        if (clipsPaths.length === 0) {
            throw new Error('No se pudo generar ningún clip o audio para las escenas.');
        }

        // Ensamblar con FFmpeg
        const finalOutput = path.join(OUTPUT_DIR, `task_${task.id}_final.mp4`);
        console.log(`[MediaWorker] 🎬 Ensamblando ${clipsPaths.length} escenas en: ${finalOutput}`);

        // Crear archivo de texto para concat de ffmpeg
        // Usamos un complejo de filtros si es necesario, pero para slideshow simple con audio:
        // Por la limitación de fluidez, lo haremos clip por clip, luego concatenamos.

        const renderedClips = [];
        for (const clip of clipsPaths) {
            const clipOutput = path.join(OUTPUT_DIR, `task_${task.id}_clip_${clip.id}.mp4`);
            await new Promise((resolve, reject) => {
                const command = ffmpeg();
                
                if (clip.isFaceless) {
                    // Si es faceless, repetimos el video de stock infinitamente hasta que acabe el audio
                    command.input(clip.img).inputOptions(['-stream_loop', '-1']);
                } else {
                    command.input(clip.img).loop();
                }

                const filterBase = clip.isFaceless
                    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
                    : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0015,1.5)':d=1:s=1080x1920:fps=30`; // Efecto de zoom para imágenes

                let vfStr = filterBase;
                if (clip.srt) {
                    // Escapar ruta para FFmpeg en Windows (C:/ruta -> C\:/ruta)
                    const escapedSrt = clip.srt.replace(/\\/g, '/').replace(':', '\\:');
                    vfStr += `,subtitles='${escapedSrt}':force_style='FontSize=26,PrimaryColour=&H00FFFF&,Bold=1,Alignment=2,MarginV=180'`;
                }

                command.input(clip.audio)
                    .outputOptions([
                        '-c:v libx264',
                        '-preset fast',
                        '-c:a aac',
                        '-b:a 192k',
                        '-pix_fmt yuv420p',
                        '-shortest', // El video dura lo que dura el audio
                        `-vf ${vfStr}`
                    ])
                    .save(clipOutput)
                    .on('end', () => {
                        renderedClips.push(clipOutput);
                        resolve();
                    })
                    .on('error', reject);
            });
        }

        // Concatenar todos los clips
        const concatTxtPath = path.join(OUTPUT_DIR, `task_${task.id}_files.txt`);
        const fileContent = renderedClips.map(file => `file '${path.resolve(file).replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(concatTxtPath, fileContent);

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatTxtPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .save(finalOutput)
                .on('end', resolve)
                .on('error', reject);
        });

        // Limpiar temporales
        [concatTxtPath, ...renderedClips, ...clipsPaths.flatMap(c => [c.img, c.audio])].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        console.log(`[MediaWorker] ✅ Video Final Completado: ${finalOutput}`);

        // Actualizar tarea a 'pending_cm_approval' para que el CEO pueda revisarla
        payload.url = `/outputs/task_${task.id}_final.mp4`;
        
        await pool.query(`
            UPDATE studio_tasks 
            SET status = 'pending_cm_approval', assigned_to = 'alex', media_payload = $1, title = $2
            WHERE id = $3
        `, [JSON.stringify([payload]), task.title, task.id]);
        
        console.log(`[MediaWorker] Tarea #${task.id} marcada como lista para revisión del CEO.`);

    } catch (error) {
        console.error(`[MediaWorker] ❌ Error crítico:`, error.message);
        // Si hay un error, revertir o marcar como fallido para que intervenga el CM
        // Solo como ejemplo de robustez:
        // await pool.query(`UPDATE studio_tasks SET status = 'failed', feedback_notes = $1 WHERE status = 'rendering' AND assigned_to = 'auto'`, [error.message]);
    } finally {
        isProcessing = false;
    }
}

console.log('[MediaWorker] 🟢 Obrero de Medios iniciado. Escuchando base de datos cada 20 segundos...');
setInterval(processTask, 20000);
// Disparar uno inmediatamente
processTask();
