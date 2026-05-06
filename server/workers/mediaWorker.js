import dotenv from 'dotenv';
dotenv.config({path: new URL('../.env', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')});
import pool from '../config/db.js';
import { GoogleGenAI } from '@google/genai';
import { EdgeTTS } from 'node-edge-tts';
import fetch from 'node-fetch';
import { generateVoice } from '../services/ttsService.js';
import { removeWatermark } from '../utils/videoProcessor.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
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
    throw new Error(`Fallback Libre activado para ahorrar costos de Imagen 3.`);
}

// Scraper de YouTube - Alternativa a Google Veo (Evita costos de 400+ MXN)
async function extractYoutubeStock(keyword, outputPath, targetDuration = 4) {
    console.log(`[YoutubeScraper] Buscando en YT: "${keyword.substring(0, 40)}..."`);
    try {
        const r = await ytSearch(keyword + ' no copyright free video');
        const videos = r.videos.filter(v => v.seconds > 10 && v.seconds < 600); // 10s a 10m
        
        if (videos.length === 0) throw new Error("No hay videos para: " + keyword);
        
        // Elegir uno random de los top 5
        const video = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
        console.log(`[YoutubeScraper] Seleccionado: ${video.title} (${video.url})`);

        const tempVidPath = outputPath.replace('.mp4', '_temp.mp4');
        
        await youtubedl(video.url, {
            output: tempVidPath,
            format: 'bestvideo[ext=mp4]/best[ext=mp4]/best',
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0']
        }, { windowsHide: true });

        console.log(`[YoutubeScraper] Descargado. Cortando 4 segundos aleatorios y limpiando marcas de agua...`);
        
        const startSec = Math.floor(Math.random() * Math.max(1, video.seconds - 6)) + 1; 
        const tempCroppedPath = outputPath.replace('.mp4', '_cropped.mp4');

        await new Promise((resolve, reject) => {
            ffmpeg(tempVidPath)
                .setStartTime(startSec)
                .setDuration(targetDuration) // Máx 4 segundos como pidió el CEO
                .outputOptions([
                     '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1',
                     '-c:v libx264',
                     '-preset ultrafast',
                     '-threads 2',
                     '-crf 28',
                     '-pix_fmt yuv420p',
                     '-an' // Extrae los videos mudos, el audio se arma en el ensamblaje final
                ])
                .save(tempCroppedPath)
                .on('end', resolve)
                .on('error', reject);
        });

        if(fs.existsSync(tempVidPath)) fs.unlinkSync(tempVidPath);

        console.log(`[YoutubeScraper] Aplicando limpiador algorítmico de marcas de agua...`);
        // Usar la herramienta delogo nativa del estudio para borrar la esquina inferior (común en shorts/tiktok descargados)
        await removeWatermark(tempCroppedPath, outputPath);
        
        if(fs.existsSync(tempCroppedPath)) fs.unlinkSync(tempCroppedPath);

        console.log(`[YoutubeScraper] ✅ Clip de YouTube extraído y limpiado con éxito.`);
        return outputPath;
    } catch (e) {
        console.error(`[YoutubeScraper] ❌ Error extrayendo YT:`, e.message);
        throw e;
    }
}

// Scraper Social (TikTok / Instagram) - Plan C
async function extractSocialStock(keyword, outputPath, platform = 'instagram', targetDuration = 4) {
    console.log(`[SocialScraper] Buscando en ${platform}: "${keyword.substring(0, 40)}..."`);
    try {
        const siteFilter = platform === 'tiktok' ? 'site:tiktok.com/video/ OR site:tiktok.com/@*/video/' : platform === 'pexels' ? 'site:pexels.com/video/' : 'site:instagram.com/reel/';
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(siteFilter + ' ' + keyword)}`;
        
        const r = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
        const html = await r.text();
        const $ = cheerio.load(html);
        
        let urls = [];
        $('a.result__url').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                const match = href.match(/uddg=([^&]+)/);
                if (match) {
                    const cleanUrl = decodeURIComponent(match[1]);
                    if (platform === 'tiktok' && cleanUrl.includes('/video/')) urls.push(cleanUrl);
                    if (platform === 'instagram' && cleanUrl.includes('/reel/')) urls.push(cleanUrl);
                    if (platform === 'pexels' && cleanUrl.includes('/video/')) urls.push(cleanUrl);
                }
            }
        });

        if (urls.length === 0) throw new Error(`No hay videos de ${platform} para: ` + keyword);
        
        const targetUrl = urls[Math.floor(Math.random() * Math.min(3, urls.length))];
        console.log(`[SocialScraper] Seleccionado: ${targetUrl}`);

        const tempVidPath = outputPath.replace('.mp4', '_temp.mp4');
        
        await youtubedl(targetUrl, {
            output: tempVidPath,
            format: 'bestvideo[ext=mp4]/best[ext=mp4]/best',
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:google.com', 'user-agent:Mozilla/5.0']
        }, { windowsHide: true });

        console.log(`[SocialScraper] Descargado. Cortando 4 segundos aleatorios y limpiando marcas de agua...`);
        
        const startSec = 2; // Cortar el inicio por si hay overlays
        const tempCroppedPath = outputPath.replace('.mp4', '_cropped.mp4');

        await new Promise((resolve, reject) => {
            ffmpeg(tempVidPath)
                .setStartTime(startSec)
                .setDuration(targetDuration)
                .outputOptions([
                     '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1',
                     '-c:v libx264',
                     '-preset ultrafast',
                     '-threads 2',
                     '-crf 28',
                     '-pix_fmt yuv420p',
                     '-an' 
                ])
                .save(tempCroppedPath)
                .on('end', resolve)
                .on('error', reject);
        });

        if(fs.existsSync(tempVidPath)) fs.unlinkSync(tempVidPath);

        console.log(`[SocialScraper] Aplicando limpiador algorítmico de marcas de agua...`);
        await removeWatermark(tempCroppedPath, outputPath);
        
        if(fs.existsSync(tempCroppedPath)) fs.unlinkSync(tempCroppedPath);

        console.log(`[SocialScraper] ✅ Clip extraído y limpiado con éxito.`);
        return outputPath;
    } catch (e) {
        console.error(`[SocialScraper] ❌ Error extrayendo ${platform}:`, e.message);
        throw e;
    }
}

// Generación de Video corto con Google Veo (Desactivado temporalmente)
async function generateVeoVideo(prompt, outputPath) {
    throw new Error(`Generación Veo deshabilitada temporalmente para ahorrar 400+ MXN.`);
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
                WHERE status = 'pending_local_test' 
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
        await sendProgress(task.id, 5, "Iniciando ensamblaje");

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

            const scenePercent = Math.floor(10 + ((i - 1) / sceneCount) * 80);
            await sendProgress(task.id, scenePercent, `Procesando Escena ${i} de ${sceneCount}`);
            console.log(`[MediaWorker] Procesando Escena ${i} (voz: ${selectedVoice})...`);
            const sceneImgPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.jpg`);
            const sceneVidPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_broll.mp4`);
            const sceneAudioPath = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}.mp3`);
            
            // Generar Medios en Paralelo para agilizar
            const promises = [];
            
            let usesBRollVideo = false;
            let targetDuration = 4;
            
            // 1. Generar la voz PRIMERO para saber la duración exacta
            if (narration) {
                await generateVoice(narration, sceneAudioPath, selectedVoice, payload.referenceAudio).catch(e => null);
                if (fs.existsSync(sceneAudioPath)) {
                    try {
                        const durStr = await new Promise((resolve, reject) => {
                            ffmpeg.ffprobe(sceneAudioPath, (err, metadata) => {
                                if (err) reject(err);
                                else resolve(metadata.format.duration);
                            });
                        });
                        targetDuration = Math.ceil(parseFloat(durStr) * 10) / 10;
                        if (targetDuration < 3) targetDuration = 3;
                    } catch (e) {
                        console.error("[MediaWorker] Error obteniendo duración de audio:", e.message);
                    }
                }
            }
            
            // 2. Extraer el video con la duración exacta
            if (videoPrompt || visualPrompt) {
                // Limpiamos el prompt para tener mejores resultados (ej. si el prompt es muy largo)
                const searchKeyword = (videoPrompt || visualPrompt).substring(0, 60).replace(/[^a-zA-Z0-9 áéíóúñ]/ig, ' ');
                
                // Priorizar PEXELS siempre porque tiene videos limpios sin texto ni ads
                promises.push(extractSocialStock(searchKeyword, sceneVidPath, 'pexels', targetDuration).catch(e => extractYoutubeStock(searchKeyword, sceneVidPath, targetDuration).catch(e2 => null)));
                usesBRollVideo = true;
            }
            
            await Promise.all(promises);

            // Resolver qué medio usar como visual (YouTube > Stock Local) - NUNCA fotos estáticas
            const randomStockName = STOCK_VIDEOS[Math.floor(Math.random() * STOCK_VIDEOS.length)].split('/').pop();
            const randomStock = path.resolve(process.cwd(), 'stock_videos', randomStockName || '853889-hd_1920_1080_25fps.mp4'); 
            
            let finalImgPath = sceneImgPath;
            let isFaceless = false;
            
            if (usesBRollVideo && fs.existsSync(sceneVidPath) && fs.statSync(sceneVidPath).size > 1000) {
                finalImgPath = sceneVidPath;
                isFaceless = true; 
            } else {
                // Si Youtube falla, usamos videos de stock
                finalImgPath = fs.existsSync(randomStock) ? randomStock : path.resolve(process.cwd(), 'stock_videos', '853889-hd_1920_1080_25fps.mp4');
                isFaceless = true;
            }

            let srtPathEs = null;
            let srtPathEn = null;
            if (fs.existsSync(sceneAudioPath)) {
                // Generar subtítulos quemados usando Whisper (Doble Pasada: Español e Inglés)
                try {
                    console.log(`[MediaWorker] 🎙️ Generando Subtítulos (ES/EN) con Whisper para Escena ${i}...`);
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

                    const outputEs = await transcriber(audioData, { 
                        chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word',
                        language: 'spanish', task: 'transcribe'
                    });
                    
                    const outputEn = await transcriber(audioData, { 
                        chunk_length_s: 30, stride_length_s: 5, return_timestamps: 'word',
                        language: 'spanish', task: 'translate'
                    });
                    
                    if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);

                    if (outputEs.chunks && outputEs.chunks.length > 0) {
                        srtPathEs = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_es.srt`);
                        fs.writeFileSync(srtPathEs, chunksToSRT(outputEs.chunks));
                    }
                    if (outputEn.chunks && outputEn.chunks.length > 0) {
                        srtPathEn = path.join(OUTPUT_DIR, `task_${task.id}_scene_${i}_en.srt`);
                        fs.writeFileSync(srtPathEn, chunksToSRT(outputEn.chunks));
                    }
                } catch (err) {
                    console.error(`[MediaWorker] ⚠️ Error en Whisper para Escena ${i}:`, err.message);
                }

                clipsPaths.push({ 
                    img: finalImgPath, 
                    audio: sceneAudioPath, 
                    srtEs: srtPathEs,
                    srtEn: srtPathEn,
                    id: i,
                    isFaceless 
                });
            }
        }

        if (clipsPaths.length === 0) {
            throw new Error('No se pudo generar ningún clip o audio para las escenas.');
        }

        // Ensamblar con FFmpeg (Añadimos timestamp para evitar caché del navegador)
        const timestampId = Date.now();
        const finalOutputName = `task_${task.id}_final_${timestampId}.mp4`;
        const finalOutput = path.join(OUTPUT_DIR, finalOutputName);
        console.log(`[MediaWorker] 🎬 Ensamblando ${clipsPaths.length} escenas en: ${finalOutput}`);
        await sendProgress(task.id, 90, "Stitch con FFmpeg...");

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
                    ? `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1`
                    : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0015,1.5)':d=1:s=1080x1920:fps=30,setsar=1`; // Efecto de zoom para imágenes

                let vfStr = filterBase;
                // Subtítulos Duales: Inglés (arriba) y Español (abajo)
                if (clip.srtEn) {
                    const relativeSrtEn = path.relative(process.cwd(), clip.srtEn).replace(/\\/g, '/');
                    vfStr += `,subtitles='${relativeSrtEn}':force_style='FontName=Arial,FontSize=100,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=4,Shadow=2,Bold=1,Alignment=2,MarginV=1400'`;
                }
                if (clip.srtEs) {
                    const relativeSrtEs = path.relative(process.cwd(), clip.srtEs).replace(/\\/g, '/');
                    vfStr += `,subtitles='${relativeSrtEs}':force_style='FontName=Arial,FontSize=100,PrimaryColour=&H0000FFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=4,Shadow=2,Bold=1,Alignment=2,MarginV=300'`;
                }

                command.input(clip.audio)
                    .outputOptions([
                        '-c:v libx264',
                        '-preset ultrafast',
                        '-threads 2',
                        '-crf 28',
                        '-c:a aac',
                        '-b:a 192k',
                        '-pix_fmt yuv420p',
                        '-r 30',
                        '-shortest', // El video dura lo que dura el audio
                        `-vf ${vfStr}`
                    ])
                    .on('start', function(commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    })
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
                await pool.query(`UPDATE studio_tasks SET status = 'failed' WHERE id = $1`, [currentTaskId]);
                await sendProgress(currentTaskId, 0, "Falló la generación");
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
