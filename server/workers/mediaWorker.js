import dotenv from 'dotenv';
dotenv.config({path: new URL('../.env', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')});
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
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' }
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

    // Si Imagen 3 falla, NO usamos Pollinations porque genera imágenes de muy baja calidad para este estándar.
    // Lanzamos error para que el Obrero use automáticamente los clips de video de Stock Cinemáticos en su lugar.
    throw new Error(`Fallback Libre desactivado para mantener calidad.`);
}

// Generación de Video corto con Google Veo
async function generateVeoVideo(prompt, outputPath) {
    console.log(`[MediaWorker] Generando Video Veo (5-8s): "${prompt.substring(0, 30)}..."`);
    
    if (process.env.GEMINI_API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            // Using the Veo model available in Gemini Advanced / Plus
            const response = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt
            });
            
            // Si la respuesta es directa (Base64)
            if (response.generatedVideos?.[0]?.video?.videoBytes) {
                const b64 = response.generatedVideos[0].video.videoBytes;
                const buffer = Buffer.from(b64, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`[MediaWorker] ✅ Video Veo generado correctamente.`);
                return outputPath;
            } else {
                console.warn(`[MediaWorker] ⚠️ Respuesta de Veo incompleta o LRO requerido. Usando fallback...`);
            }
        } catch (e) {
            console.warn(`[MediaWorker] ⚠️ Google Veo falló (${e.message}). Usando Fallback cinemático...`);
        }
    } else {
        console.warn(`[MediaWorker] ⚠️ GEMINI_API_KEY no detectada para Veo.`);
    }

    // Fallback de alta calidad (Si Veo falla, no usamos imágenes feas, usamos un video cinemático limpio)
    console.log(`[MediaWorker] 🔄 Usando video de stock Faceless de alta calidad como respaldo.`);
    const randomStock = STOCK_VIDEOS[Math.floor(Math.random() * STOCK_VIDEOS.length)];
    // As it is a URL or Local path. In our current implementation, we use a local one for fallback
    const localStock = path.resolve(process.cwd(), 'stock_videos', '853889-hd_1920_1080_25fps.mp4');
    return localStock;
}

async function processTask() {
    if (isProcessing) return;
    
    let currentTaskId = null;
    try {
        isProcessing = true;
        
        // 1. Tomar la siguiente tarea de la cola y bloquearla inmediatamente
        const res = await pool.query(`
            UPDATE studio_tasks 
            SET status = 'rendering'
            WHERE id = (
                SELECT id FROM studio_tasks 
                WHERE status = 'pending_render' 
                ORDER BY created_at ASC LIMIT 1
            )
            RETURNING *;
        `);

        if (res.rowCount === 0) {
            isProcessing = false;
            return; // Nada en cola
        }

        const task = res.rows[0];
        currentTaskId = task.id;
        console.log(`\n[MediaWorker] 🚀 Iniciando ensamblaje para Tarea #${task.id}: ${task.title}`);

        const payload = typeof task.media_payload === 'string' ? JSON.parse(task.media_payload) : task.media_payload;
        
        if (!payload || !payload.scenes) {
            throw new Error('El payload no contiene escenas estructuradas.');
        }

        const isArrayFormat = Array.isArray(payload.scenes);
        const dayData = payload.scenes;
        
        // Rotación de voces hiperrealistas (ElevenLabs) vs Edge TTS (Backup)
        const fallbackVoices = process.env.ELEVENLABS_API_KEY 
            ? ['elevenlabs:pNInz6obbfIdGwnf8p5A', 'elevenlabs:ErXwobaYiN019PkySvjV', 'elevenlabs:TxGEqnHWrfWFTfGW9XjX'] 
            : ['edge:es-MX-JorgeNeural', 'edge:es-MX-DaliaNeural', 'edge:es-ES-AlvaroNeural', 'edge:es-ES-ElviraNeural', 'edge:es-AR-TomasNeural'];
        
        const selectedVoice = payload.voice || fallbackVoices[task.id % fallbackVoices.length];
        const clipsPaths = [];

        const sceneCount = isArrayFormat ? dayData.length : (payload.sceneCount || 5);

        // Generaremos las imágenes + voz por cada escena
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

            console.log(`[MediaWorker] Procesando Escena ${i} (voz: ${selectedVoice})...`);
            const sceneImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.jpg`);
            const sceneVidPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_veo.mp4`);
            const sceneAudioPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.mp3`);
            
            // Generar Medios en Paralelo para agilizar
            const promises = [];
            
            let usesVeoVideo = false;
            // ESTRATEGIA HÍBRIDA DE COSTOS: Veo es carísimo. Solo lo usamos para el Hook (Escena 1).
            // Para el resto (Escena 2-5), usamos Google Imagen 3 (mucho más barato y estable que lo free) o stock faceless.
            if (videoPrompt && i === 1) {
                promises.push(generateVeoVideo(videoPrompt, sceneVidPath).catch(e => null));
                usesVeoVideo = true;
            } else if (visualPrompt) {
                // Alternamos entre Imágenes generadas (Imagen 3) y el Video local Faceless
                const isFaceless = (i % 2 === 0);
                if (!isFaceless) {
                    promises.push(generateImage(visualPrompt, sceneImgPath).catch(e => null));
                }
            }

            if (narration) promises.push(generateVoice(narration, sceneAudioPath, selectedVoice, payload.referenceAudio).catch(e => null));
            
            await Promise.all(promises);

            const randomStock = path.resolve(process.cwd(), 'stock_videos', '853889-hd_1920_1080_25fps.mp4');
            let finalImgPath = sceneImgPath;
            let isFaceless = false;
            
            // Resolver qué medio usar como visual (Veo Video > Imagen > Stock)
            if (usesVeoVideo && fs.existsSync(sceneVidPath) && fs.statSync(sceneVidPath).size > 1000) {
                finalImgPath = sceneVidPath;
                isFaceless = true; // Tratamos los MP4 de Veo como "faceless" para el renderizado (loop infinito hasta acabar audio)
            } else if (visualPrompt && !videoPrompt && i % 2 !== 0) {
                if (!fs.existsSync(sceneImgPath) || fs.statSync(sceneImgPath).size < 1000) {
                    console.warn(`[MediaWorker] ⚠️ Imagen falló. Usando stock faceless.`);
                    finalImgPath = randomStock;
                    isFaceless = true;
                }
            } else {
                finalImgPath = randomStock;
                isFaceless = true;
            }

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

                    const output = await transcriber(audioData, { 
                        chunk_length_s: 30, 
                        stride_length_s: 5, 
                        return_timestamps: 'word',
                        language: 'spanish',
                        task: 'transcribe'
                    });
                    
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
                    img: finalImgPath, 
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
                
                if (clip.isFaceless || clip.img.endsWith('.mp4')) {
                    // Si es faceless, repetimos el video de stock infinitamente hasta que acabe el audio
                    command.input(clip.img).inputOptions(['-stream_loop', '-1']);
                } else {
                    // Para imágenes, necesitamos loop como input option
                    command.input(clip.img).inputOptions(['-loop', '1', '-framerate', '30']);
                }

                const filterBase = clip.isFaceless
                    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
                    : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0015,1.5)':d=1:s=1080x1920:fps=30`; // Efecto de zoom para imágenes

                let vfStr = filterBase;
                // Subtítulos dinámicos tipo "Hormozi" integrados (quemados) al video
                if (clip.srt) {
                    const escapedSrt = clip.srt.replace(/\\/g, '/').replace(':', '\\:');
                    // Colores BGR: Amarillo es &H0000FFFF&, Blanco es &H00FFFFFF&
                    // Alignment=2 es Bottom-Center. MarginV=600 lo eleva para que la UI de TikTok no lo tape (no queda a media pantalla).
                    vfStr += `,subtitles='${escapedSrt}':force_style='FontName=Arial,FontSize=48,PrimaryColour=&H0000FFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=3,Shadow=1,Bold=1,Alignment=2,MarginV=600'`;
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

        // Limpiar temporales (Evitar borrar el video de stock)
        [concatTxtPath, ...renderedClips, ...clipsPaths.flatMap(c => [c.img, c.audio])].forEach(f => {
            if (fs.existsSync(f) && !f.includes('stock_videos')) fs.unlinkSync(f);
        });

        console.log(`[MediaWorker] ✅ Video Final Completado: ${finalOutput}`);

        // Actualizar tarea a 'pending_cm_approval' para que el CEO pueda revisarla
        payload.url = `/outputs/task_${task.id}_final.mp4`;
        
        await pool.query(`
            UPDATE studio_tasks 
            SET status = 'pending_cm_approval', assigned_to = 'auto', media_payload = $1, title = $2
            WHERE id = $3
        `, [JSON.stringify([payload]), task.title, task.id]);
        
        console.log(`[MediaWorker] Tarea #${task.id} marcada como lista para revisión del CEO.`);

    } catch (error) {
        console.error(`[MediaWorker] ❌ Error crítico:`, error.message);
        if (currentTaskId) {
            try {
                await pool.query(`UPDATE studio_tasks SET status = 'failed' WHERE id = $1`, [currentTaskId]);
                console.log(`[MediaWorker] Tarea #${currentTaskId} marcada como failed.`);
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
// Disparar uno inmediatamente
processTask();
