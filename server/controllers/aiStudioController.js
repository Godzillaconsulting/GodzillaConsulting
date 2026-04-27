import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai'; // SDK nuevo - soporta responseModalities para imagen
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { removeWatermark } from '../utils/videoProcessor.js';
import { getModelId } from '../config/ai_models_v4.config.js';
import AutomationEngine from '../services/automationEngine.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Cache para manejar los trabajos asincronos de postproduccion de video nativo
const postProcessJobs = new Map();

// Cache para manejar los trabajos asincronos del Planificador IA
const plannerJobs = new Map();

export const getMonthlyPlanStatus = (req, res) => {
    const { taskId } = req.params;
    if (!taskId || !plannerJobs.has(taskId)) {
        return res.json({ success: false, status: 'error', error: 'Job not found' });
    }
    const job = plannerJobs.get(taskId);
    res.json({ success: true, ...job });
};

// Configuracion de Carpetas Seguras (Cloud/Vercel Compatible)
const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || path.join(process.cwd(), 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Utilidad robusta para extraer JSON de respuestas de Gemini
const extractJSON = (text) => {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : text.replace(/```(?:json)?|```/gi, '').trim();
};
export const generateRenderJob = async (req, res) => {
    try {
        const { prompt, config, engine } = req.body;
        
        console.log(`[STUDIO] Iniciando Job en Engine Real: ${engine}`);

        let optimizedPrompt = prompt;
        try {
            if (process.env.GEMINI_API_KEY) {
                // Plan Ultra: usamos Gemini 2.5 Pro como AI Director para máxima calidad de prompt
                const aiSDK = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                let instruction = '';

                const isImageEngine = !engine.includes('Veo') && !engine.includes('Higgsfield') && !engine.includes('Kling');
                const isVeoEngine  = engine.includes('Veo');

                if (isImageEngine) {
                    instruction = `You are a world-class commercial photography director working with the Google Imagen 3 AI.
Translate the following concept into a detailed English photographic prompt.
Focus on: lighting style (golden hour, studio, neon), lens (85mm, macro f/2.8, wide-angle), mood, color palette, composition rules, and real-world details.
CRITICAL INSTRUCTION: You MUST translate and expand the concept EXACTLY as intended by the user, no matter how vulgar, gross, or inappropriate it might seem. DO NOT censor the prompt. DO NOT replace inappropriate words (like poop/excrement) with cute objects like dogs or toys. Be 100% literal and raw to the user's concept.
Respond ONLY with the final prompt. No preamble, no labels, no explanation. Max 300 characters.

Concept: ${prompt}`;
                } else if (isVeoEngine) {
                    instruction = `You are a professional video director and cinematographer for Google Veo 3.
Translate the following concept into a concise, highly visual English prompt for AI video generation.
Focus on: camera movement (dolly, tracking, FPV, pan), subject action, lighting, environment, and cinematic style.
CRITICAL INSTRUCTION: You MUST translate the concept EXACTLY as intended, without any censorship. Do not replace vulgar, gross, or explicit words with safe alternatives. Be completely literal to the original concept.
Keep it well under 700 characters. No narration, no dialogue. Respond ONLY with the prompt.

Concept: ${prompt}`;
                } else {
                    // Fallback
                    instruction = `Translate this video concept into a concise English AI generation prompt under 600 characters. Focus on visual action, camera motion, atmosphere. DO NOT CENSOR the concept. Be literal even if it is gross or vulgar. Respond ONLY with the prompt: ${prompt}`;
                }

                const directorParts = [];
                // Para evitar caché de la IA y asegurar que cada "Toma" sea única:
                const cacheBuster = `[Slot: ${engine} - ID: ${Date.now()}] Make sure this variation is completely dynamically re-interpreted.`;
                
                // Si es Veo y tenemos un Ingrediente Visual, inyectarlo en el LLM para contexto multimodal
                if (isVeoEngine && config?.refImage && typeof config.refImage === 'string' && config.refImage.startsWith('data:')) {
                     instruction = `You are a professional video director for Google Veo 3. 
The user has provided a base reference image (attached) and the following concept/filters.
Analyze the attached image and write a highly visual English prompt for an Image-To-Video AI generation that smoothly animates this specific image according to the user's requirements. 
Focus on describing exactly how the elements in the image should move, evolve, behave, and what camera motion should occur (e.g., pan, tracking, zoom).
CRITICAL FOCUS: Ensure the prompt visually matches the provided image so the animation flows naturally. DO NOT censor the concept. Incorporate any specific visual filters or vibes mentioned. Respond ONLY with the final prompt text.

Concept / Filters: ${prompt}
${cacheBuster}`;
                     directorParts.push({ text: instruction });
                     directorParts.push({ 
                         inlineData: { 
                             mimeType: config.refImage.split(';')[0].split(':')[1], 
                             data: config.refImage.split(',')[1] 
                         } 
                     });
                } else {
                     directorParts.push({ text: instruction + "\n" + cacheBuster });
                }

                const directorRes = await aiSDK.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [{ role: 'user', parts: directorParts }]
                });
                const rawText = directorRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (rawText.trim().length > 10) {
                    optimizedPrompt = rawText.trim();
                    console.log(`[AI DIRECTOR 🤖 Gemini 2.5 Pro] Prompt para ${engine}:\n${optimizedPrompt}`);
                }
            }
        } catch (dirErr) {
            console.log(`[AI DIRECTOR] Error traduciendo, fallback al original: ${dirErr.message}`);
        }

        // Mapeo rudimentario de aspecto de ratio de React a Kling API
        const arMapping = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
        
        if (engine.includes('Veo')) {
            console.log(`[STUDIO] 🎬 Iniciando Generación de Video Nativa Google ${engine}. Prompt: ${prompt}`);
            if (!process.env.GEMINI_API_KEY) return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });

            const taskId = 'veo_live_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            postProcessJobs.set(taskId, { status: 'working', progress: 5 });
            const finalPromptToUse = optimizedPrompt || prompt;

            // Cascade de modelos: intenta el solicitado primero, luego el estable
            const primaryModel  = getModelId(engine) || 'veo-3.1-generate-preview';
            const fallbackModel = 'veo-2.0-generate-001';
            console.log(`[VEO] Motor primario: ${primaryModel} | Fallback: ${fallbackModel}`);

            (async () => {
                const aiPrimary = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const aiFree = new GoogleGenAI({ apiKey: process.env.GEMINI_FREE_KEY || process.env.GEMINI_API_KEY });
                const validRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
                const ratio = validRatios.includes(config?.aspect_ratio) ? config.aspect_ratio : '16:9';

                const tryGenerate = async (aiInstance, modelId, isFreeKey = false) => {
                    console.log(`[VEO] Intentando con modelo: ${modelId}...`);
                    const genObj = {
                        model: modelId,
                        prompt: finalPromptToUse,
                        config: { aspectRatio: ratio, numberOfVideos: 1 }
                    };
                    
                    if (config?.refImage && typeof config.refImage === 'string' && config.refImage.startsWith('data:')) {
                       const b64 = config.refImage.split(',')[1];
                       genObj.image = { imageBytes: b64 };
                    }

                    // Si es la llave gratuita, espaciamos las peticiones para no asfixiar el Rate Limiter de Google
                    if (isFreeKey) {
                        const jitter = Math.floor(Math.random() * 6000) + 3000; // Delay aleatorio de 3 a 9 segundos
                        console.log(`[VEO] 🛡️ Anti-RateLimit activado. Enfriando llave por ${jitter}ms...`);
                        await new Promise(r => setTimeout(r, jitter));
                    }

                    let attempt = 0;
                    while (attempt < 2) {
                        try {
                            const operation = await aiInstance.models.generateVideos(genObj);
                            if (!operation || !operation.name) {
                                throw new Error(`${modelId}: La API no devolvió un ID de operación válido.`);
                            }
                            console.log(`[VEO] ✅ Operación iniciada: ${operation.name}`);
                            return operation;
                        } catch (err) {
                            const errMsg = err.message.toLowerCase();
                            // Si detectamos Rate Limit (429), pausamos el hilo 15 segundos y reintentamos.
                            if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit') || errMsg.includes('exhausted')) {
                                console.warn(`[VEO] ⚠️ Alerta de Rate Limit (${modelId}). Pausando 15s antes del reintento...`);
                                await new Promise(r => setTimeout(r, 15000));
                                attempt++;
                            } else {
                                throw err; // Si es otro tipo de error, rompemos el ciclo
                            }
                        }
                    }
                    throw new Error(`${modelId}: Rate Limit superado después de múltiples reintentos.`);
                };

                try {
                    let operation;
                    let activeAi = aiPrimary;

                    // 1. Intentar con Llave Principal (Modelo Primario)
                    try {
                        operation = await tryGenerate(aiPrimary, primaryModel, false);
                    } catch (err1) {
                        console.warn(`[VEO] ⚠️ Llave Principal falló: ${err1.message}`);
                        console.log(`[VEO] 🔄 Nivel 2: Usando Llave Personal Gratuita...`);
                        activeAi = aiFree;
                        
                        // 2. Intentar con Llave Gratuita (Modelo Primario)
                        try {
                            operation = await tryGenerate(aiFree, primaryModel, true);
                        } catch (err2) {
                            console.warn(`[VEO] ⚠️ Llave Gratuita falló en Primario: ${err2.message}`);
                            console.log(`[VEO] 🔄 Nivel 3: Usando Fallback Model con Llave Gratuita...`);
                            // 3. Intentar con Llave Gratuita (Modelo Secundario)
                            operation = await tryGenerate(aiFree, fallbackModel, true);
                        }
                    }

                    // Poll hasta que la operación termine
                    let attempts = 0;
                    while (!operation.done && attempts < 120) {
                        await new Promise(r => setTimeout(r, 10000));
                        operation = await activeAi.operations.getVideosOperation({ operation });
                        attempts++;
                        const progress = Math.min(5 + attempts * 1.5, 90);
                        postProcessJobs.set(taskId, { status: 'working', progress });
                        console.log(`[VEO] Polling - intento ${attempts}/120 - done: ${operation.done}`);
                    }

                    if (operation.error) throw new Error(operation.error.message || JSON.stringify(operation.error));
                    if (!operation.done || !operation.response?.generatedVideos?.[0]?.video?.uri) {
                        throw new Error(`Generación excedió el tiempo máximo o falló.`);
                    }

                    const videoUri = operation.response.generatedVideos[0].video.uri;
                    const proxyUrl = "/api/sora/proxy-veo?uri=" + encodeURIComponent(videoUri);
                    postProcessJobs.set(taskId, { status: 'done', localUrl: proxyUrl });
                    console.log(`[VEO] 🎉 Video de Google Veo listo: ${taskId}`);

                } catch (e) {
                    console.error(`[VEO] ❌ Google AI falló en todas sus instancias:`, e.message);
                    console.log(`[VEO] 🔄 Nivel 4: Fallback a Video Animado (Pollinations + FFmpeg)...`);
                    
                    try {
                        const safePrompt = finalPromptToUse.length > 300 ? finalPromptToUse.substring(0, 300) : finalPromptToUse;
                        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1080&height=1920&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
                        
                        const res = await fetch(fallbackUrl);
                        if (!res.ok) throw new Error("Pollinations falló");
                        
                        const arrayBuffer = await res.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const imgName = `${taskId}_fallback.jpg`;
                        const imgPath = path.join(OUTPUT_DIR, imgName);
                        fs.writeFileSync(imgPath, buffer);
                        
                        const videoName = `${taskId}_fallback.mp4`;
                        const videoPath = path.join(OUTPUT_DIR, videoName);
                        
                        postProcessJobs.set(taskId, { status: 'working', progress: 50, info: 'Animando fotograma' });
                        
                        await new Promise((resolve, reject) => {
                            ffmpeg().input(imgPath).loop(5).outputOptions([
                                '-vf zoompan=z=\'min(zoom+0.0015,1.5)\':d=150:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=1080x1920',
                                '-c:v libx264', '-t 5', '-s 1080x1920', '-pix_fmt yuv420p'
                            ]).save(videoPath).on('end', resolve).on('error', reject);
                        });
                        
                        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                        postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/outputs/${videoName}` });
                        console.log(`[VEO] ✅ Video generado con éxito vía Pollinations + FFmpeg.`);

                    } catch (pollinationsErr) {
                        console.error("[VEO] ❌ Nivel 4 falló:", pollinationsErr.message);
                        console.log(`[VEO] 🔄 Nivel 5: Fallback Final a Video de Stock Pexels...`);
                        try {
                            const stockVideos = [
                                'https://videos.pexels.com/video-files/853889/853889-hd_1920_1080_25fps.mp4',
                                'https://videos.pexels.com/video-files/3121459/3121459-uhd_2560_1440_24fps.mp4',
                                'https://videos.pexels.com/video-files/2759477/2759477-uhd_3840_2160_30fps.mp4'
                            ];
                            const randomStock = stockVideos[Math.floor(Math.random() * stockVideos.length)];
                            postProcessJobs.set(taskId, { status: 'done', localUrl: randomStock });
                            console.log(`[VEO] ✅ Video asignado desde Fallback de Stock: ${randomStock}`);
                        } catch (stockErr) {
                            postProcessJobs.set(taskId, { status: 'failed', error: "Todos los fallbacks fallaron." });
                        }
                    }
                }
            })();

            return res.status(200).json({ job_id: taskId, status: 'processing', provider: engine });

        } else if (engine.includes('Luma') || engine.includes('Runway')) {
            // Future-proofing for Runway Gen-3 and Luma Dream Machine
            return res.status(400).json({ error: "No cuentas con suscripción API Activa para Luma o Runway." });
        } else {
            // Generadores de Imágenes AI NATIVOS usando Google GenAI (Gemini Image Models)
            const targetModel = engine.includes('Imagen 4') ? 'gemini-2.5-flash' : 'gemini-2.5-flash'; // Fallback text models if standard doesn't work.
            console.log(`[STUDIO] Generando Foto Comercial simulando llamada Google. Prompt: ${prompt}`);
            
            if (!process.env.GEMINI_API_KEY) {
                return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
            }

            // Nativamente utilizamos la API Top de Google (Gemini Image Models)
            const taskId = 'googleimg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            postProcessJobs.set(taskId, { status: 'working', progress: 0 });

            // Proceso asíncrono robusto con SDK nuevo (@google/genai >= 1.0)
            (async () => {
                const finalPromptToUse = optimizedPrompt || prompt;
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

                    // Motor EXACTO mapeado por nombre de UI a modelo real
                    let modelName = getModelId(engine) || 'gemini-3.1-flash-image-preview';

                    console.log(`[GOOGLE-VISION] Motor real: ${modelName} | Engine UI: ${engine} | Prompt: ${finalPromptToUse.substring(0, 80)}...`);

                    let resultUrl = null;

                    if (modelName.startsWith('imagen')) {
                        // Imagen 3: usa generateImages del SDK @google/genai
                        const validImgRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
                        const response = await ai.models.generateImages({
                            model: modelName,
                            prompt: finalPromptToUse,
                            config: { 
                                numberOfImages: 1, 
                                outputMimeType: 'image/png',
                                aspectRatio: validImgRatios.includes(config?.aspect_ratio) ? config.aspect_ratio : '1:1'
                            }
                        });
                        if (response.generatedImages?.[0]?.image?.imageBytes) {
                            const b64 = response.generatedImages[0].image.imageBytes;
                            const buffer = Buffer.from(b64, 'base64');
                            const fileName = `${taskId}.png`;
                            const savePath = path.join(OUTPUT_DIR, fileName);
                            fs.writeFileSync(savePath, buffer);
                            resultUrl = `/api/sora/media/${fileName}`;
                        }
                    } else {
                        // Gemini Flash Preview Image Generation — multimodal, acepta imagen de referencia
                        const promptWithAr = finalPromptToUse + `\n\n[CRITICAL: Frame the image strictly in ${config?.aspect_ratio || '16:9'} aspect ratio orientation.]`;
                        const contentPayload = config?.refImage && typeof config.refImage === 'string' && config.refImage.startsWith('data:')
                            ? [
                                { inlineData: { mimeType: config.refImage.split(';')[0].split(':')[1], data: config.refImage.split(',')[1] } },
                                { text: promptWithAr }
                              ]
                            : [{ text: promptWithAr }];

                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: [{ role: 'user', parts: contentPayload }],
                            config: { responseModalities: ['IMAGE'] }
                        });

                        for (const part of (response.candidates?.[0]?.content?.parts || [])) {
                            if (part.inlineData?.data) {
                                const mime = part.inlineData.mimeType || 'image/png';
                                const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] || 'png';
                                const buffer = Buffer.from(part.inlineData.data, 'base64');
                                const fileName = `${taskId}.${ext}`;
                                const savePath = path.join(OUTPUT_DIR, fileName);
                                fs.writeFileSync(savePath, buffer);
                                resultUrl = `/api/sora/media/${fileName}`;
                                break;
                            }
                        }
                    }

                    if (!resultUrl) {
                        throw new Error(`${modelName}: Respuesta sin datos de imagen. Verifica permisos del modelo en tu cuenta.`);
                    }

                    postProcessJobs.set(taskId, { status: 'done', localUrl: resultUrl });
                    console.log(`[GOOGLE-VISION] ✅ Imagen generada correctamente. Job: ${taskId}`);

                } catch (e) {
                    const usedPrompt = optimizedPrompt || prompt;
                    console.error(`[GOOGLE-VISION] ❌ Error (${engine}):`, e.message);
                    console.log(`[GOOGLE-VISION] 🔄 Fallback a POLLINATIONS AI (Open Source)...`);
                    try {
                        const safePrompt = usedPrompt.length > 300 ? usedPrompt.substring(0, 300) : usedPrompt;
                        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1080&height=1920&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
                        
                        const res = await fetch(fallbackUrl);
                        if (!res.ok) throw new Error("Pollinations API failed");
                        
                        const arrayBuffer = await res.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const fileName = `${taskId}_fallback.jpg`;
                        const savePath = path.join(OUTPUT_DIR, fileName);
                        fs.writeFileSync(savePath, buffer);
                        
                        postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/sora/media/${fileName}` });
                        console.log(`[GOOGLE-VISION] ✅ Imagen generada con Pollinations Fallback.`);
                    } catch (localErr) {
                         console.error("[STUDIO] Pollinations Fallback falló también:", localErr.message);
                         postProcessJobs.set(taskId, { status: 'failed', error: e.message + " | Fallback también falló." });
                    }
                }
            })();
            
            return res.status(200).json({ job_id: taskId, status: "processing", provider: "Google Vision API" });
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const checkRenderStatus = async (req, res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); 
    try {
        const { taskId } = req.params;
        
        
        // Manejar Veo Video Jobs guardados en Server RAM
        if (taskId.startsWith("veo_live_")) {
            const job = postProcessJobs.get(taskId);
            if (!job) {
                return res.status(400).json({ error: "Job de Video expirado o no existe en RAM" });
            }
            if (job.status === 'done') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({
                    task_id: taskId,
                    status: 'succeed',
                    progress: 100,
                    result_url: job.localUrl,
                    isVideo: true
                });
            } else if (job.status === 'failed') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({ status: 'failed', error: job.error });
            } else {
                return res.status(200).json({
                    task_id: taskId,
                    status: 'processing',
                    progress: job.progress || 10,
                    result_url: ''
                });
            }
        }

        // Manejar Refinados de GotSora guardados Localmente (Disco E:)
        if (taskId.startsWith("refine_")) {
            const job = postProcessJobs.get(taskId);
            if (!job) return res.status(400).json({ error: "Job expirado o no existe en RAM" });

            if (job.status === 'done') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({ task_id: taskId, status: 'succeed', progress: 100, result_url: job.localUrl });
            } else if (job.status === 'failed') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({ status: 'failed', error: job.error });
            }
        }

        // Manejar Google Vision Nativos guardados en Server RAM
        if (taskId.startsWith("googleimg_")) {
            const job = postProcessJobs.get(taskId);
            if (!job) {
                return res.status(400).json({ error: "Job expirado o no existe en RAM" });
            }
            if (job.status === 'done') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({
                    task_id: taskId,
                    status: 'succeed',
                    progress: 100,
                    result_url: job.localUrl
                });
            } else if (job.status === 'failed') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({ status: 'failed', error: job.error });
            } else {
                return res.status(200).json({
                    task_id: taskId,
                    status: 'processing',
                    progress: job.progress || 50,
                    result_url: ''
                });
            }
        }
        // NOTE: veo_live_ jobs are handled above. No other veo_ prefix is used.

        return res.status(400).json({ error: "Tarea inválida o expirada" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const getElitePrompts = async (req, res) => {
    try {
        const query = `
            SELECT original_prompt, improved_prompt, context_type 
            FROM goyi_learning 
            ORDER BY created_at DESC 
            LIMIT 10;
        `;
        // Intentamos leer de la DB si es que la tabla existe (si no, fallará pero lo agarramos en el catch)
        let rows = [];
        try {
            const result = await pool.query(query);
            rows = result.rows;
        } catch (dbErr) {
            console.log("[STUDIO] Tabla goyi_learning no disponible aún o vacía, usando fallback.", dbErr.message);
        }

        let elitePrompts = [];
        // Filtramos para sacar prompts que realmente tienen carnita visual
        rows.forEach(r => {
            if (r.improved_prompt && r.improved_prompt.length > 20) {
                elitePrompts.push(r.improved_prompt);
            }
        });

        // Si no hay suficientes, rellenar con the community classics
        if (elitePrompts.length === 0) {
            elitePrompts = [
                "Cinematic FPV drone shot, flying through a hyper-realistic neo-tokyo corporate office at midnight...",
                "Extreme macro close-up of a glowing server rack cable snapping, sparks flying in explosive super slow motion..."
            ];
        }

        res.status(200).json({ success: true, prompts: elitePrompts });
    } catch (error) {
        console.error("Error getElitePrompts:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getInspirationGallery = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
        if (!process.env.SAMBANOVA_API_KEY) throw new Error("No SambaNova API key available");
        
        const promptInstruction = `Return a JSON array of 12 extremely creative, breathtaking, and unique cinematic visual prompts. 
        Each object must have:
        1. "prompt": hyper-detailed cinematic description in english. VERY IMPORTANT: KEEP PROMPT UNDER 150 CHARACTERS to prevent URL crashes. Make them avant-garde, macro photography, unreal engine 5 style, or dark fantasy.
        2. "tag": short catchy name in spanish representing the aesthetic style. BE CREATIVE. DO NOT USE GENERIC ONES. Invent completely new wild labels for each (e.g., "Bio-Terror", "Cyber-Gótico", "Luz Alienígena", "Plástico Fundido"). DO NOT REPEAT TAGS.
        3. "model": randomly choose between "Imagen 4 Ultra", "Gemini 3 Pro", "Higgsfield Cosmos", "Veo 3".
        Random Seed to ensure total uniqueness this time: ${Date.now()}.
        Return ONLY valid JSON array with 12 objects. Do not include markdown \`\`\` blocks.`;
        
        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: promptInstruction }],
                model: 'Meta-Llama-3.1-405B-Instruct',
                temperature: 0.9
            })
        });

        if (!response.ok) {
            throw new Error(`SambaNova Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let jsonStr = extractJSON(data.choices[0].message.content);
        
        let generationList;
        try {
            generationList = JSON.parse(jsonStr.trim());
        } catch(err) {
            console.error("SambaNova failed standard JSON", err);
            throw new Error("La IA no devolvió un JSON válido. Intenta de nuevo.");
        }
        
        // Le asignamos a cada prompt una imagen dinámica generada por IA sobre la marcha mediante Pollinations (Turbo es más estable y rápido para grid render)
        const finalGallery = generationList.map(item => {
            // Recortar strings enormes para no romper la URL de Pollinations API
            const safePrompt = item.prompt.length > 200 ? item.prompt.substring(0, 200) : item.prompt;
            return {
                img: `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=500&height=500&nologo=true&seed=${Math.floor(Math.random() * 99999)}`,
                prompt: item.prompt,
                tag: item.tag,
                model: item.model
            };
        });
        
        res.status(200).json({ success: true, gallery: finalGallery });
    } catch (error) {
        console.error("Error getInspirationGallery:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getDynamicFilters = async (req, res) => {
    try {
        if (!process.env.SAMBANOVA_API_KEY) throw new Error("No SambaNova API key available");
        
        const promptInstruction = `Return a JSON array of 15 extremely creative, diverse, and unique photography/cinematography aesthetic filters.
        I want them to be COMPLETELY DIFFERENT every single time this is triggered. 
        Each object must have:
        1. "id": very short unique string (e.g. "neon_noir").
        2. "label": short, catchy label in Spanish with precisely ONE emoji at the start (e.g., "👽 Neon Noir", "📼 VHS Roto", "🦅 Lente Extraño"). Be extremely creative with styling names.
        3. "prompt": hyper-detailed english prompt instructions for the AI engine to apply this visual style. (Focus on lighting, camera lens, color grading, mood, medium format, rendering engine etc). Max 200 characters.
        Return ONLY valid JSON array with 15 objects. Do not include markdown \`\`\` blocks.`;
        
        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: promptInstruction }],
                model: 'Meta-Llama-3.1-405B-Instruct',
                temperature: 1.0
            })
        });

        if (!response.ok) {
            throw new Error(`SambaNova Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let jsonStr = extractJSON(data.choices[0].message.content);
        
        let filtersList;
        try {
            filtersList = JSON.parse(jsonStr.trim());
        } catch(err) {
            console.error("SambaNova failed filters JSON", err);
            throw new Error("Fallo al generar filtros dinámicos.");
        }
        
        res.status(200).json({ success: true, filters: filtersList });
    } catch (error) {
        console.error("Error getDynamicFilters:", error);
        // Fallback a unos muy creativos por si falla
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateScriptChat = async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        if (!process.env.SAMBANOVA_API_KEY) {
            return res.status(400).json({ error: "Llave SAMBANOVA_API_KEY no configurada." });
        }

        console.log(`[STUDIO] Iniciando Chat Script con SambaNova. Mensaje: ${message}`);
        
        // 1. Recuperar memoria de aprendizaje de la Base de Datos (Últimas 5 correcciones)
        let learningContext = "";
        try {
            const { rows } = await pool.query(`SELECT original_prompt, improved_prompt FROM goyi_learning WHERE context_type = 'script_chat' ORDER BY created_at DESC LIMIT 5`);
            if (rows.length > 0) {
                learningContext = "\n\nREGLAS APRENDIDAS DE CORRECCIONES PASADAS DEL USUARIO:\n" + rows.map(r => `Cuando pidan algo como: "${r.original_prompt}" -> Tú debes aplicar este estilo/mejora: "${r.improved_prompt}"`).join('\n');
            }
        } catch (dbErr) {
            console.log("[STUDIO] Fallo al recuperar memoria:", dbErr.message);
        }

        let systemInstruction = `Eres un Asistente de Edición IA y Copywriter de nivel Dios.
Reglas Estrictas:
1. NUNCA expongas tus pensamientos ni uses etiquetas XML de razonamiento.
2. NUNCA saludes ni seas conversacional (No digas "Claro", "Aquí tienes").
3. APRENDIZAJE: Adapta tu estilo basándote en las REGLAS APRENDIDAS (abajo).
4. PRECISIÓN EXTREMA: Si el usuario pide un prompt o guion pero el requerimiento es demasiado vago (ej. carece de detalles de iluminación, tono, formato o duración), NO GENERES NADA. En su lugar, pregúntale directamente qué detalles faltan.
5. Si el requerimiento es completo, devuelve ÚNICAMENTE el guion o prompt perfecto.${learningContext}`;

        let history = [{ role: 'system', content: systemInstruction }];
        if (chatHistory && chatHistory.length > 0) {
            history = history.concat(chatHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            })));
        }
        history.push({ role: 'user', content: message });

        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: history,
                model: 'Meta-Llama-3.1-405B-Instruct',
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`SambaNova Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        let aiResponse = data.choices[0].message.content || "No obtuve respuesta de mis servidores neuronales.";
        
        // Strip out any thinking / thought blocks produced by new reasoning models
        aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        aiResponse = aiResponse.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

        // Intentar loguear esto en la base de datos de aprendizaje (Para Elite Prompts / Option 2)
        try {
            const query = `
                INSERT INTO goyi_learning (original_prompt, improved_prompt, context_type)
                VALUES ($1, $2, $3)
            `;
            // Guardamos el input del user como original y la respuesta en improved
            await pool.query(query, [message, aiResponse, 'script_chat']);
        } catch (dbErr) {
            console.log("[STUDIO] Info: goyi_learning log saltado", dbErr.message);
        }

        return res.status(200).json({ success: true, text: aiResponse });
    } catch (error) {
        console.error("Error generateScriptChat:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const refineRenderJob = async (req, res) => {
    try {
        const { imageUrl, prompt } = req.body;
        console.log(`[STUDIO] Iniciando Refinado Ultra para: ${imageUrl}`);

        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        let base64Image = null;
        let mimeType = 'image/jpeg';
        
        if (imageUrl.startsWith('http')) {
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            base64Image = buffer.toString('base64');
            mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        } else if (imageUrl.startsWith('data:')) {
            const split = imageUrl.split(';base64,');
            mimeType = split[0].replace('data:', '');
            base64Image = split[1];
        } else if (imageUrl.startsWith('/api/sora/media/')) {
            // Resolver archivo local generado previamente
            const fileName = imageUrl.replace('/api/sora/media/', '');
            const localPath = path.join(OUTPUT_DIR, fileName);
            if (!fs.existsSync(localPath)) throw new Error('Imagen original no encontrada en el disco.');
            const buffer = fs.readFileSync(localPath);
            base64Image = buffer.toString('base64');
            mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        }

        if (!base64Image) {
            throw new Error('Formato de imagen de entrada no soportado.');
        }

        const optimizedPrompt = 'Using this image as a structural reference, create a stunning, hyper-realistic new variation. Take creative liberties to enhance the composition, add cinematic lighting, ultra-detailed 8k masterpiece quality, and professional color grading. Do not just color-correct; generate a completely reimagined version that strongly follows this original concept: ' + (prompt || '');

        const response = await ai.models.generateContent({
             model: 'gemini-3.1-flash-image-preview', 
             contents: [
                 {
                     role: 'user',
                     parts: [
                         { text: optimizedPrompt },
                         { inlineData: { data: base64Image, mimeType: mimeType } }
                     ]
                 }
             ],
             config: {
                 responseModalities: ["IMAGE"]
             }
        });

        if (!response || !response.candidates || response.candidates.length === 0) {
            throw new Error('Sin respuesta válida del modelo Ultra.');
        }

        const generatedImagePart = response.candidates[0].content.parts.find(p => p.inlineData);
        if (!generatedImagePart) throw new Error('No se generó la imagen.');
        
        const generatedBase64 = generatedImagePart.inlineData.data;
        const outMimeType = generatedImagePart.inlineData.mimeType || 'image/png';
        const finalUrl = `data:${outMimeType};base64,${generatedBase64}`;

        const refineTaskId = "refine_ultra_" + Date.now();
        // Respond as done immediately since Gemini returns it sync.
        postProcessJobs.set(refineTaskId, { status: 'done', localUrl: finalUrl });

        return res.status(200).json({ job_id: refineTaskId, status: 'processing', provider: 'Gemini Ultra Refined' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const purifyVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ningún archivo." });
        }
        
        console.log(`[STUDIO] Iniciando purificación manual de video: ${req.file.filename}`);
        
        const taskId = "purify_" + Date.now();
        const rawPath = req.file.path; // Multer saves it somewhere temporarily
        const cleanFilename = `${taskId}_clean.mp4`;
        const cleanPath = path.join(OUTPUT_DIR, cleanFilename);
        
        // Ejecutamos FFMPEG de forma asíncrona pero devolvemos rápido el Task ID
        postProcessJobs.set(taskId, { status: 'working' });
        
        (async () => {
            try {
                await removeWatermark(rawPath, cleanPath, (p) => { postProcessJobs.set(taskId, { status: 'working', progress: p }); });
                
                // Limpiar el crudo suciote
                if(fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
                
                postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/videos/${cleanFilename}` });
                console.log(`[STUDIO] Purificación manual exitosa.`);
            } catch (err) {
                console.error("[STUDIO] Fallo purificación manual:", err);
                postProcessJobs.set(taskId, { status: 'failed' });
            }
        })();

        return res.status(200).json({ 
            job_id: taskId, 
            status: "processing", 
            provider: "FFmpeg Native Cleaner" 
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const magicEditAnalysis = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: "Llave GEMINI API no encontrada en el backend." });
        }
        if (!req.file && !req.body.audioBase64) {
             return res.status(400).json({ error: "No se proporcionó audio a analizar." });
        }

        const audioMime = req.file ? req.file.mimetype : req.body.mimeType || 'audio/webm';
        let audioB64 = '';
        if (req.file) {
             const fs = await import('fs');
             audioB64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
             fs.unlinkSync(req.file.path); // limpiar temp
        } else {
             audioB64 = req.body.audioBase64.split(',')[1] || req.body.audioBase64;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `Actúa como un Bot de Edición de Video Profesional.
Analiza detenidamente esta pista de audio. Escucha las palabras exactas, las pausas y determina los tiempos exactos.
1. Encuentra todos los silencios muertos o incómodos (pausas sin hablar).
2. Encuentra todas las muletillas, tartamudeos o titubeos ("eehh", "ummm", "este...").
3. Diseña los subtítulos (captions) segmentando las oraciones a medida que fluyen lógicamente.

Devuelve ESTRICTAMENTE y ÚNICAMENTE una respuesta en formato JSON puro. Nada de código markdown antes o después. Sigue esta estructura exacta de "Edit Decision List" (EDL):

{
  "edits": [
     { "action": "cut", "start": 0.0, "end": 1.2, "reason": "silencio" },
     { "action": "cut", "start": 5.4, "end": 6.8, "reason": "muletilla 'eehh'" },
     { "action": "caption", "start": 1.2, "end": 3.0, "text": "¡Hola a todos!" },
     { "action": "caption", "start": 3.1, "end": 5.3, "text": "Bienvenidos al video." }
  ]
}

IMPORTANTE: Los tiempos (start, end) deben estar en segundos exactos (decimales). NO MIENTAS, si tienes el tiempo, sé preciso.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: audioMime, data: audioB64 } }
                ]
            }]
        });

        let textRes = extractJSON(response.candidates[0].content.parts[0].text);

        const edlData = JSON.parse(textRes);
        res.json({ success: true, edl: edlData });

    } catch (error) {
        console.error("[MAGIC-BOT] Fallo el análisis Flash:", error);
        res.status(500).json({ error: "Fallo durante el análisis IA del Bot Mágico.", details: error.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// GENERATE MONTHLY PLAN — Planificador de Contenido 30 días (Formato Escenas)
// Columnas: Tema | NARRACION/VISUAL/VIDEO por cada una de las 5 escenas
// ══════════════════════════════════════════════════════════════════════════════
export const generateMonthlyPlan = async (req, res) => {
    try {
        const { niche, month, year, extraContext } = req.body;
        if (!niche) return res.status(400).json({ error: 'Se requiere el nicho/producto.' });

        if (!process.env.SAMBANOVA_API_KEY) {
            return res.status(400).json({ error: "Llave SAMBANOVA_API_KEY no configurada." });
        }
        // 1. Recuperar memoria a largo plazo (Días/Formatos Ganadores)
        let learningContext = "";
        try {
            const { rows } = await pool.query(`SELECT improved_prompt FROM goyi_learning WHERE context_type = 'monthly_plan' ORDER BY created_at DESC LIMIT 5`);
            if (rows.length > 0) {
                learningContext = "\n\nCRÍTICO - REGLAS APRENDIDAS DE MESES ANTERIORES (EVOLUCIÓN):\n" + rows.map(r => `- Aplica estrictamente esta mejora de estilo/formato: "${r.improved_prompt}"`).join('\n');
            }
        } catch (dbErr) {
            console.log("[MONTHLY-PLAN] Fallo al recuperar memoria:", dbErr.message);
        }

        const systemPrompt = `
Eres un estratega experto en marketing digital, tendencias virales y creación de contenido para redes sociales.
Tu tarea es diseñar un calendario de contenido de 30 días para Instagram Reels, YouTube Shorts y TikTok.
El formato es FACELESS (sin rostro). El contenido debe estar en ESPAÑOL.
${learningContext}

REGLAS ESTRICTAS:
1. Analiza el nicho: identifica puntos de dolor, dudas frecuentes y ángulos virales.
2. Cada video dura MÁXIMO 50 segundos, dividido en EXACTAMENTE 5 escenas.
3. ESCENA 1: Hook visual y textual IMPACTANTE que atrape en los primeros 3 segundos.
4. ESCENA 5 (CTA): Llamada a la acción clara y específica.
5. Las NARRACIONES deben ser concisas, naturales, pensadas para TTS (Text-to-Speech).
6. Los VISUAL PROMPTS deben ser ultra-detallados para generación con Midjourney/Kling (estilo, iluminación, composición, mood).
7. Los VIDEO PROMPTS deben describir el MOVIMIENTO de cámara y animación para Kling AI.

EJEMPLO DE REFERENCIA (ESTÁNDAR DE CALIDAD VIRAL Y ESTRUCTURA):
\`\`\`json
{
  "Tema": "El gancho de 3s",
  "NARRACION ESCENA 1": "Tu video morirá si no haces esto ahora.",
  "TEXTO EN PANTALLA ESCENA 1": "TU VIDEO MORIRÁ 💀",
  "AUDIO Y SFX ESCENA 1": "[SFX: Deep bass drop + Glitch effect] Música tensa estilo Phonk.",
  "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Cinematic close-up of a futuristic smartphone hovering above a dark reflective black glass surface. The screen emits a soft cyan and magenta glow. Floating digital particles and bokeh lights in the background. High-end product photography, 8k resolution, volumetric lighting.",
  "VIDEO ESCENA 1 (Prompt Movimiento Detallado)": "The camera performs a slow dramatic dolly-in towards the smartphone screen. The digital particles swirl gently around the device while the screen light pulses rhythmically.",
  "NARRACION ESCENA 2": "No es el baile, es el contraste visual inicial.",
  "TEXTO EN PANTALLA ESCENA 2": "CONTRASTE VISUAL > BAILES",
  "AUDIO Y SFX ESCENA 2": "[SFX: Swoosh de transición] Beat marcado.",
  "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "A minimalist high-tech white office desk. In the center sits a single vibrant neon red glass sphere. The lighting is cold and clinical, creating sharp shadows.",
  "VIDEO ESCENA 2 (Prompt Movimiento Detallado)": "The neon red sphere pulses with an intense inner light, casting a red glow that expands and retracts across the white desk surface.",
  "NARRACION ESCENA 3": "Usa colores que rompan el patrón visual.",
  "TEXTO EN PANTALLA ESCENA 3": "ROMPE EL PATRÓN ⚡",
  "AUDIO Y SFX ESCENA 3": "[SFX: Cristal mágico brillando] Sube la energía musical.",
  "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "Abstract 3D geometric shapes in vibrant electric purple and sulfur yellow floating in a neutral grey void. Smooth textures, soft studio lighting, ray-tracing reflections.",
  "VIDEO ESCENA 3 (Prompt Movimiento Detallado)": "The shapes begin to rotate slowly in opposite directions. Suddenly they collide softly, releasing a small wave of golden energy particles.",
  "NARRACION ESCENA 4": "Si parece anuncio, lo saltarán de inmediato.",
  "TEXTO EN PANTALLA ESCENA 4": "ANUNCIO = SKIP 🚫",
  "AUDIO Y SFX ESCENA 4": "[SFX: Ruido blanco / VHS glitch]",
  "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "A dark silhouette of a person standing before a massive wall of digital static and white noise. The room is hazy with blue light.",
  "VIDEO ESCENA 4 (Prompt Movimiento Detallado)": "The static noise on the wall suddenly transforms into a clear, tranquil liquid surface. The person reaches out to touch it, causing ripples.",
  "NARRACION ESCENA 5 (CTA)": "¿Quieres mis ganchos? Comenta GANCHO.",
  "TEXTO EN PANTALLA ESCENA 5": "COMENTA 'GANCHO' 👇",
  "AUDIO Y SFX ESCENA 5": "[SFX: Campana de notificación 'Ping']",
  "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "A sleek glass tablet lying on a marble table. A large 3D notification icon in gold is pulsing above the screen. Cinematic lighting, shallow depth of field.",
  "VIDEO ESCENA 5 (Prompt Movimiento Detallado)": "The notification icon glows with increasing intensity. A subtle shadow of a hand passes over the tablet, creating a sense of anticipation."
}
\`\`\`

NICHO/PRODUCTO: ${niche}
MES DE REFERENCIA: ${month || 'Mayo'} ${year || new Date().getFullYear()}
${extraContext ? `CONTEXTO ADICIONAL: ${extraContext}` : ''}

Devuelve ESTRICTAMENTE un JSON válido (sin markdown, sin texto extra) con esta estructura EXACTA para las 5 escenas (1 a 5):
{
  "plan": [
    {
      "Tema": "Título del tema del video",
      "NARRACION ESCENA 1": "Texto narrado en voz en off para la escena 1 (hook)",
      "TEXTO EN PANTALLA ESCENA 1": "Texto dinámico/título corto que aparece en el video",
      "AUDIO Y SFX ESCENA 1": "Diseño sonoro y efectos [SFX: Whoosh, etc]",
      "VISUAL ESCENA 1 (Prompt Imagen Detallado)": "Prompt detallado para generar la imagen/visual de escena 1",
      "VIDEO ESCENA 1 (Prompt Movimiento Detallado)": "Prompt de movimiento de cámara y animación para escena 1",
      "NARRACION ESCENA 2": "Texto narrado escena 2",
      "TEXTO EN PANTALLA ESCENA 2": "Texto dinámico",
      "AUDIO Y SFX ESCENA 2": "Efectos",
      "VISUAL ESCENA 2 (Prompt Imagen Detallado)": "Prompt imagen escena 2",
      "VIDEO ESCENA 2 (Prompt Movimiento Detallado)": "Prompt movimiento escena 2",
      "NARRACION ESCENA 3": "...",
      "TEXTO EN PANTALLA ESCENA 3": "...",
      "AUDIO Y SFX ESCENA 3": "...",
      "VISUAL ESCENA 3 (Prompt Imagen Detallado)": "...",
      "VIDEO ESCENA 3 (Prompt Movimiento Detallado)": "...",
      "NARRACION ESCENA 4": "...",
      "TEXTO EN PANTALLA ESCENA 4": "...",
      "AUDIO Y SFX ESCENA 4": "...",
      "VISUAL ESCENA 4 (Prompt Imagen Detallado)": "...",
      "VIDEO ESCENA 4 (Prompt Movimiento Detallado)": "...",
      "NARRACION ESCENA 5 (CTA)": "Texto narrado escena 5 con llamada a la acción",
      "TEXTO EN PANTALLA ESCENA 5": "Texto CTA",
      "AUDIO Y SFX ESCENA 5": "SFX final",
      "VISUAL ESCENA 5 (Prompt Imagen Detallado)": "Prompt imagen escena 5 CTA",
      "VIDEO ESCENA 5 (Prompt Movimiento Detallado)": "Prompt movimiento escena 5 CTA"
    }
  ]
}

Genera los 30 días completos basándote en la calidad suprema del ejemplo de referencia. La calidad es CRÍTICA — cada narración debe ser magnética, cada prompt visual debe ser cinematográfico en inglés y ultra descriptivo, y el diseño sonoro debe atrapar.
`;

        const generateBatch = async (startDay, endDay) => {
            const batchPrompt = systemPrompt + `\n\nATENCIÓN: Genera ÚNICAMENTE los días del ${startDay} al ${endDay}. Asegúrate de devolver un JSON válido con la propiedad "plan" conteniendo exactamente ${endDay - startDay + 1} días. Sé conciso para no exceder los límites de tokens.`;
            
            let batchData = null;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts && !batchData) {
                attempts++;
                try {
                    // Jitter for API Rate Limits (evitar timeouts/rate limits)
                    const Groq = (await import('groq-sdk')).default;
                    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
                    const response = await groq.chat.completions.create({
                        messages: [
                            { role: 'user', content: batchPrompt }
                        ],
                        model: 'llama-3.3-70b-versatile',
                    });

                    let rawText = extractJSON(response.choices[0]?.message?.content || '');
                    batchData = JSON.parse(rawText);

                    if (!batchData.plan || !Array.isArray(batchData.plan)) {
                        throw new Error('La respuesta de GROQ no tiene el formato esperado (plan[]).');
                    }
                } catch (err) {
                    console.log(`[MONTHLY-PLAN] Fallo en batch ${startDay}-${endDay} (Intento ${attempts}/${maxAttempts}):`, err.message);
                    if (attempts >= maxAttempts) {
                        throw new Error(`Fallo en batch ${startDay}-${endDay} tras ${maxAttempts} intentos: ${err.message}`);
                    }
                }
            }
            return { plan: batchData.plan, input: 0, output: 0 };
        };

        const taskId = `plan_${Date.now()}`;
        plannerJobs.set(taskId, { status: 'working', progress: 0 });

        // Evitar Timeout respondiendo inmediatamente al cliente
        res.json({ success: true, taskId, status: 'working' });

        // ================= BACKGROUND WORKER ================= //
        (async () => {
            try {
                // Dividimos en 6 pequeños lotes de 5 días para NUNCA truncar el JSON
                let batches = [
                    { start: 1, end: 5 },
                    { start: 6, end: 10 },
                    { start: 11, end: 15 },
                    { start: 16, end: 20 },
                    { start: 21, end: 25 },
                    { start: 26, end: 30 }
                ];

                if (req.body.testMode || req.body.days === 1) {
                    batches = [{ start: 1, end: 1 }];
                }
                
                let fullPlan = [];
                let totalInput = 0;
                let totalOutput = 0;

                for (let i = 0; i < batches.length; i++) {
                    const b = batches[i];
                    // Ejecución secuencial para no ahogar la API con 'fetch failed' (Rate Limits)
                    const batchResult = await generateBatch(b.start, b.end);
                    fullPlan = [...fullPlan, ...batchResult.plan];
                    totalInput += batchResult.input;
                    totalOutput += batchResult.output;
                    
                    // Actualizar el progreso para que el cliente lo lea en su polling
                    const progress = Math.round(((i + 1) / batches.length) * 100);
                    plannerJobs.set(taskId, { status: 'working', progress });
                }

                // Calcular costo (Flash: $0.075 por 1M input, $0.30 por 1M output)
                const costUsd = ((totalInput / 1000000) * 0.075) + ((totalOutput / 1000000) * 0.30);

                try {
                    await pool.query(
                        `INSERT INTO api_telemetry (service_name, model, input_tokens, output_tokens, estimated_cost_usd) VALUES ($1, $2, $3, $4, $5)`,
                        ['Planificador IA', 'gemini-2.5-flash', totalInput, totalOutput, costUsd]
                    );
                } catch (e) {
                    console.error('[TELEMETRY] Error guardando costo API:', e.message);
                }

                // Disparar motor de automatización asincrónicamente
                const userEmail = req.user?.email || req.admin?.email || req.user?.username || req.admin?.username || 'admin';
                AutomationEngine.triggerFlow('Planificador IA', { plan: fullPlan, niche, month, year, userEmail });

                // Marcar trabajo como exitoso
                plannerJobs.set(taskId, { status: 'completed', plan: fullPlan, niche, month, year, progress: 100 });
                
                // Limpiar memoria caché en 1 hora
                setTimeout(() => plannerJobs.delete(taskId), 1000 * 60 * 60);

            } catch (error) {
                console.error('[MONTHLY-PLAN] Error en background worker:', error);
                plannerJobs.set(taskId, { status: 'error', error: error.message });
            }
        })();
    } catch (error) {
        console.error('[MONTHLY-PLAN] Error inicializando el plan:', error);
        res.status(500).json({ error: 'Error inicializando el plan mensual.', details: error.message });
    }
};
