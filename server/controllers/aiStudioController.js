import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai'; // SDK nuevo - soporta responseModalities para imagen
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { removeWatermark } from '../utils/videoProcessor.js';
import { getModelId } from '../config/ai_models_v4.config.js';

// Cache para manejar los trabajos asincronos de postproduccion de video nativo
const postProcessJobs = new Map();
// Genera el JWT riguroso solicitado por la arquitectura de Kling AI 
function generateKlingAuthToken() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    
    if (!accessKey || !secretKey) {
        throw new Error("Kling Keys not configured in .env");
    }

    const payload = {
        iss: accessKey,
        exp: Math.floor(Date.now() / 1000) + (1800), // Validez de 30 mins
        nbf: Math.floor(Date.now() / 1000) - 5
    };

    return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
}

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
                    instruction = `You are a professional video director and cinematographer for Google Veo 2.
Translate the following concept into a concise, highly visual English prompt for AI video generation.
Focus on: camera movement (dolly, tracking, FPV, pan), subject action, lighting, environment, and cinematic style.
CRITICAL INSTRUCTION: You MUST translate the concept EXACTLY as intended, without any censorship. Do not replace vulgar, gross, or explicit words with safe alternatives. Be completely literal to the original concept.
Keep it well under 700 characters. No narration, no dialogue. Respond ONLY with the prompt.

Concept: ${prompt}`;
                } else {
                    // Higgsfield / Kling
                    instruction = `Translate this video concept into a concise English AI generation prompt under 600 characters. Focus on visual action, camera motion, atmosphere. DO NOT CENSOR the concept. Be literal even if it is gross or vulgar. Respond ONLY with the prompt: ${prompt}`;
                }

                const directorRes = await aiSDK.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [{ role: 'user', parts: [{ text: instruction }] }]
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
        
        let response;
        if (engine.includes('Kling')) {
            let token;
            try {
                token = generateKlingAuthToken();
            } catch (authError) {
                console.log(`[STUDIO] Llaves Kling faltantes. Entrando en modo de simulación para motor: ${engine}`);
                return res.status(200).json({
                    job_id: "simulated_task_" + Date.now(),
                    status: "processing",
                    provider: engine
                });
            }

            // Ejemplo de body para Text-To-Video Kling V1
            const requestBody = {
                model: "kling-v1",
                prompt: optimizedPrompt || "cyberpunk shot",
                negative_prompt: config.negative || "",
                ratio: arMapping[config.aspect_ratio] || '16:9',
                duration: config.duration === '10' ? "10" : "5"
            };

            response = await fetch('https://api.klingai.com/v1/videos/text2video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();
            if (!response.ok || data.code !== 0) {
                 return res.status(400).json({ error: data.message || "Fallo en API Kling" });
            }
            return res.status(200).json({ job_id: data.data.task_id, status: "processing", provider: engine });

        } else if (engine.includes('Veo')) {
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
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const ratio = (config?.aspect_ratio === '9:16') ? '9:16' : '16:9';

                const tryGenerate = async (modelId) => {
                    console.log(`[VEO] Intentando con modelo: ${modelId}...`);
                    const operation = await ai.models.generateVideos({
                        model: modelId,
                        prompt: finalPromptToUse,
                        config: { aspectRatio: ratio, numberOfVideos: 1 }
                    });
                    // Validar que la operación tiene nombre antes de hacer polling
                    if (!operation || !operation.name) {
                        throw new Error(`${modelId}: La API no devolvió un ID de operación válido. Verifica que tu cuenta tenga acceso a este modelo.`);
                    }
                    console.log(`[VEO] ✅ Operación iniciada: ${operation.name}`);
                    return operation;
                };

                try {
                    let operation;

                    // Intentar modelo primario, con fallback automático
                    try {
                        operation = await tryGenerate(primaryModel);
                    } catch (primaryErr) {
                        console.warn(`[VEO] ⚠️ Modelo ${primaryModel} falló: ${primaryErr.message}`);
                        console.log(`[VEO] 🔄 Usando fallback: ${fallbackModel}`);
                        postProcessJobs.set(taskId, { status: 'working', progress: 8, info: `Fallback a ${fallbackModel}` });
                        operation = await tryGenerate(fallbackModel);
                    }

                    // Poll hasta que la operación long-running termine (máx 10 min)
                    let attempts = 0;
                    while (!operation.done && attempts < 60) {
                        await new Promise(r => setTimeout(r, 10000)); // espera 10s
                        operation = await ai.operations.getVideosOperation({ operation });
                        attempts++;
                        const progress = Math.min(5 + attempts * 1.5, 90);
                        postProcessJobs.set(taskId, { status: 'working', progress });
                        console.log(`[VEO] Polling - intento ${attempts}/60 - done: ${operation.done} - error: ${operation.error?.message || 'ninguno'}`);
                    }

                    // Verificar error en la operación final
                    if (operation.error) {
                        throw new Error(`Error de Google Veo: ${operation.error.message || JSON.stringify(operation.error)}`);
                    }

                    if (!operation.done || !operation.response?.generatedVideos?.[0]?.video?.uri) {
                        throw new Error(`Timeout o sin URI de video en la respuesta. Intentos: ${attempts}`);
                    }

                    const videoUri = operation.response.generatedVideos[0].video.uri;
                    console.log(`[VEO] ✅ Video URI recibida: ${videoUri.substring(0, 60)}...`);

                    const proxyUrl = "/api/sora/proxy-veo?uri=" + encodeURIComponent(videoUri);
                    postProcessJobs.set(taskId, { status: 'done', localUrl: proxyUrl });
                    console.log(`[VEO] 🎉 Video listo: ${taskId}`);

                } catch (e) {
                    console.error(`[VEO] ❌ Error final (${engine}):`, e.message);
                    // Guardar el mensaje de error COMPLETO para que el frontend lo muestre
                    postProcessJobs.set(taskId, { status: 'failed', error: e.message });
                }
            })();

            return res.status(200).json({ job_id: taskId, status: 'processing', provider: engine });

        } else if (engine.includes('Luma') || engine.includes('Runway')) {
            // Future-proofing for Runway Gen-3 and Luma Dream Machine
            return res.status(400).json({ error: "No cuentas con suscripción API Activa para Luma o Runway." });
        } else if (engine.includes('Higgsfield')) {
            if (!process.env.HIGGSFIELD_API_KEY) {
                return res.status(400).json({ error: "HIGGSFIELD_API_KEY no configurada en el servidor." });
            }
            
            const taskId = 'higgsfield_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            postProcessJobs.set(taskId, { status: 'working', progress: 0 });
            
            (async () => {
                try {
                    const finalPromptToUse = optimizedPrompt || prompt;
                    console.log(`[HIGGSFIELD] 🎥 Iniciando generación con motor: ${engine}`);

                    // Mapeo de nombre de motor en UI a modelo real de la API
                    const modelMap = {
                        'Higgsfield Soul':       'higgsfield-ai/soul/standard',
                        'Higgsfield Standard':   'higgsfield-ai/soul/standard',
                        'Higgsfield DoP Lite':   'higgsfield-ai/dop/lite',
                        'Higgsfield DoP Standard':'higgsfield-ai/dop/standard',
                        'Higgsfield DoP Turbo':  'higgsfield-ai/dop/turbo',
                        'Higgsfield Cosmos':     'higgsfield-ai/dop/standard', // Alias legacy
                        'Higgsfield Fast':       'higgsfield-ai/dop/turbo',    // Alias legacy
                    };
                    const modelId = modelMap[engine] || 'higgsfield-ai/soul/standard';
                    const isVideo = modelId.includes('/dop/');

                    // Nueva API: platform.higgsfield.ai
                    const endpoint = `https://platform.higgsfield.ai/${modelId}`;
                    const hBody = {
                        inputs: [
                            { name: 'prompt', value: finalPromptToUse }
                        ]
                    };
                    if (isVideo && config?.aspect_ratio) hBody.inputs.push({ name: 'aspect_ratio', value: config.aspect_ratio });
                    if (isVideo && config?.duration)     hBody.inputs.push({ name: 'duration', value: parseInt(config.duration, 10) });

                    // Auth: "Key {key_id}:{key_secret}" pero la clave que guardamos en .env ya es el token completo
                    const authHeader = process.env.HIGGSFIELD_API_KEY.startsWith('Key ') 
                        ? process.env.HIGGSFIELD_API_KEY 
                        : `Bearer ${process.env.HIGGSFIELD_API_KEY}`;

                    console.log(`[HIGGSFIELD] POST ${endpoint}`);
                    const hRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                        body: JSON.stringify(hBody)
                    });
                    const rawText = await hRes.text();
                    let hData;
                    try { hData = JSON.parse(rawText); } catch (e) {
                        throw new Error(`Higgsfield respuesta inválida (HTTP ${hRes.status}): ${rawText.substring(0, 120)}`);
                    }

                    if (!hRes.ok) {
                        const errMsg = hData?.error || hData?.detail || hData?.message || JSON.stringify(hData);
                        // Detectar error de créditos
                        if (hRes.status === 402 || (typeof errMsg === 'string' && errMsg.toLowerCase().includes('credit'))) {
                            throw new Error(`💳 Saldo insuficiente en Higgsfield. Recarga créditos en cloud.higgsfield.ai/billing`);
                        }
                        throw new Error(`Error Higgsfield (HTTP ${hRes.status}): ${errMsg}`);
                    }

                    const requestId = hData.request_id || hData.id || hData.task_id;
                    if (!requestId) throw new Error(`Higgsfield no devolvió request_id. Respuesta: ${JSON.stringify(hData).substring(0, 120)}`);

                    postProcessJobs.set(taskId, { status: 'delegated', provider_job_id: requestId, isVideo });
                    console.log(`[HIGGSFIELD] ✅ Job creado: ${requestId} | Modelo: ${modelId}`);

                } catch (e) {
                    console.error("[HIGGSFIELD] ❌ Error:", e.message);
                    postProcessJobs.set(taskId, { status: 'failed', error: e.message });
                }
            })();
            
            return res.status(200).json({ job_id: taskId, status: 'processing', provider: engine });

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
                        const response = await ai.models.generateImages({
                            model: modelName,
                            prompt: finalPromptToUse,
                            config: { numberOfImages: 1, outputMimeType: 'image/png' }
                        });
                        if (response.generatedImages?.[0]?.image?.imageBytes) {
                            const b64 = response.generatedImages[0].image.imageBytes;
                            const buffer = Buffer.from(b64, 'base64');
                            const fileName = `${taskId}.png`;
                            const savePath = path.join('E:/GodzillaSora_Outputs', fileName);
                            fs.writeFileSync(savePath, buffer);
                            resultUrl = `/api/sora/media/${fileName}`;
                        }
                    } else {
                        // Gemini Flash Preview Image Generation — multimodal, acepta imagen de referencia
                        const contentPayload = config?.refImage && typeof config.refImage === 'string' && config.refImage.startsWith('data:')
                            ? [
                                { inlineData: { mimeType: config.refImage.split(';')[0].split(':')[1], data: config.refImage.split(',')[1] } },
                                { text: finalPromptToUse }
                              ]
                            : [{ text: finalPromptToUse }];

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
                                const savePath = path.join('E:/GodzillaSora_Outputs', fileName);
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
                    console.log(`[GOOGLE-VISION] 🔄 Fallback a GODZILLA NATIVE TENSOR (Local GPU)...`);
                    try {
                        const localRes = await fetch('http://127.0.0.1:5000/sora-start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: usedPrompt, mode: 'photo', diffusion_steps: 4 })
                        });
                        const localData = await localRes.json();
                        if (localData.success) {
                            postProcessJobs.set(taskId, { status: 'delegated', local_task_id: localData.task_id });
                        } else {
                            throw new Error("Sora Engine Rejected.");
                        }
                    } catch (localErr) {
                         console.error("[STUDIO] Local Fallback falló también:", localErr.message);
                         postProcessJobs.set(taskId, { status: 'failed', error: e.message });
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
        
        // Manejar modo simulado
        if (taskId.startsWith("simulated_task_")) {
            return res.status(200).json({
                task_id: taskId,
                status: "succeed",
                progress: 100,
                result_url: "" // El frontend tiene fallbacks visuales
            });
        }
        
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
        // Manejar Higgsfield Jobs guardados en Server RAM (generación delegada)
        if (taskId.startsWith("higgsfield_")) {
            const job = postProcessJobs.get(taskId);
            if (!job) {
                return res.status(400).json({ error: "Job de Higgsfield expirado o no existe en RAM" });
            }
            if (job.status === 'done') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({
                    task_id: taskId, status: 'succeed', progress: 100,
                    result_url: job.localUrl, isVideo: job.isVideo || false
                });
            } else if (job.status === 'failed') {
                postProcessJobs.delete(taskId);
                return res.status(200).json({ status: 'failed', error: job.error });
            } else if (job.status === 'delegated') {
                try {
                    const abortController = new AbortController();
                    const timeoutId = setTimeout(() => abortController.abort(), 4000);

                    // Nueva API: platform.higgsfield.ai/requests/{id}/status
                    const statusUrl = `https://platform.higgsfield.ai/requests/${job.provider_job_id}/status`;
                    const authHeader = process.env.HIGGSFIELD_API_KEY.startsWith('Key ') 
                        ? process.env.HIGGSFIELD_API_KEY 
                        : `Bearer ${process.env.HIGGSFIELD_API_KEY}`;

                    const hRes = await fetch(statusUrl, {
                        headers: { 'Authorization': authHeader },
                        signal: abortController.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (hRes.status === 502 || hRes.status === 504) {
                        job.retries = (job.retries || 0) + 1;
                        if (job.retries > 8) {
                            job.status = 'failed';
                            job.error = "Higgsfield timeout (502). Múltiples reintentos fallidos.";
                            return res.status(200).json({ status: 'failed', error: job.error });
                        }
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                    }
                    
                    const rawText = await hRes.text();
                    let hData;
                    try { hData = JSON.parse(rawText); } catch (e) {
                        throw new Error(`Higgsfield Status Error (HTTP ${hRes.status}): ${rawText.substring(0, 60)}`);
                    }
                    if (!hRes.ok) throw new Error(hData?.error || hData?.message || hData?.detail || `HTTP ${hRes.status}`);
                    
                    const status = hData.status || hData.state;
                    if (status === 'completed' || status === 'succeed' || status === 'succeeded') {
                        // Extraer URL del média generado
                        const mediaUrl = hData.videos?.[0]?.url 
                            || hData.images?.[0]?.url 
                            || hData.output?.url 
                            || hData.url;
                        if (!mediaUrl) throw new Error(`Higgsfield completó pero sin URL en respuesta: ${JSON.stringify(hData).substring(0, 80)}`);
                        
                        job.status = 'done';
                        job.localUrl = mediaUrl;
                        return res.status(200).json({ task_id: taskId, status: 'succeed', progress: 100, result_url: mediaUrl, isVideo: job.isVideo || false });
                    } else if (status === 'failed' || status === 'error') {
                        const errMsg = hData.error || hData.message || 'Error interno en Higgsfield';
                        job.status = 'failed'; job.error = errMsg;
                        return res.status(200).json({ status: 'failed', error: errMsg });
                    } else {
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: hData.progress || 40, result_url: '' });
                    }
                } catch(pe) {
                    if (pe.name === 'AbortError') {
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: 40, result_url: '' });
                    }
                    console.error("[HIGGSFIELD] Polling Error:", pe.message);
                    return res.status(200).json({ task_id: taskId, status: 'processing', progress: 40, result_url: '' });
                }
            } else {
                return res.status(200).json({ task_id: taskId, status: 'processing', progress: job.progress || 10, result_url: '' });
            }
        }
        


        // NOTE: veo_live_ jobs are handled above. No other veo_ prefix is used.

        let token;
        try {
            token = generateKlingAuthToken();
        } catch (authErr) {
            return res.status(200).json({ status: "processing", progress: 0 }); // Fallback on error
        }

        const response = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.code !== 0) {
            return res.status(400).json({ error: data.message });
        }

        const taskInfo = data.data;
        // taskInfo.task_status enum: 'submitted', 'processing', 'succeed', 'failed'
        if (taskInfo.task_status === 'succeed' && taskInfo.task_result) {
            const rawUrl = taskInfo.task_result.videos[0].url;
            
            // Si ya fue limpiado por nosotros
            if (postProcessJobs.has(taskId)) {
                const job = postProcessJobs.get(taskId);
                if (job.status === 'done') {
                    return res.status(200).json({
                        task_id: taskId,
                        status: 'succeed',
                        progress: 100,
                        result_url: job.localUrl
                    });
                } else if (job.status === 'failed') {
                    return res.status(400).json({ error: "Fallo durante remocion de marca de agua" });
                } else {
                    return res.status(200).json({ task_id: taskId, status: 'processing', progress: 99, result_url: '' }); // Aun limpiando
                }
            } else {
                // Iniciar trabajo de FFmpeg Watermark Removal Local
                postProcessJobs.set(taskId, { status: 'working' });
                
                // Fire and Forget async process
                (async () => {
                    try {
                        const mediaDir = 'E:/assets';
                        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

                        const rawRes = await fetch(rawUrl);
                        const arrBuf = await rawRes.arrayBuffer();
                        const buf = Buffer.from(arrBuf);
                        const rawPath = path.join(mediaDir, `${taskId}_raw.mp4`);
                        const cleanPath = path.join(mediaDir, `${taskId}_clean.mp4`);
                        
                        fs.writeFileSync(rawPath, buf);
                        
                        console.log(`[STUDIO] FFMPEG: Borrando marca de agua Kling en ${taskId}...`);
                        await removeWatermark(rawPath, cleanPath, (p) => { postProcessJobs.set(taskId, { status: 'working', progress: p }); });
                        
                        fs.unlinkSync(rawPath);
                        
                        postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/videos/${taskId}_clean.mp4` });
                    } catch (err) {
                        console.error("[STUDIO] Fallo ffmpeg inpainting automático:", err);
                        postProcessJobs.set(taskId, { status: 'failed' });
                    }
                })();

                return res.status(200).json({ task_id: taskId, status: 'processing', progress: 99, result_url: '' });
            }
        }

        return res.status(200).json({
            task_id: taskId,
            status: taskInfo.task_status,
            progress: taskInfo.task_status === 'succeed' ? 100 : 50,
            result_url: ''
        });

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
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini API key available for inspiration");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const promptInstruction = `Return a JSON array of 12 extremely creative, breathtaking, and unique cinematic visual prompts. 
        Each object must have:
        1. "prompt": hyper-detailed cinematic description in english. VERY IMPORTANT: KEEP PROMPT UNDER 150 CHARACTERS to prevent URL crashes. Make them avant-garde, macro photography, unreal engine 5 style, or dark fantasy.
        2. "tag": short catchy name in spanish representing the aesthetic style. BE CREATIVE. DO NOT USE GENERIC ONES. Invent completely new wild labels for each (e.g., "Bio-Terror", "Cyber-Gótico", "Luz Alienígena", "Plástico Fundido"). DO NOT REPEAT TAGS.
        3. "model": randomly choose between "Imagen 4 Ultra", "Gemini 3 Pro", "Higgsfield Cosmos", "Veo 3".
        Return ONLY valid JSON array with 12 objects. Do not include markdown \`\`\` blocks.`;
        
        const resp = await ai.generateContent({
             contents: [{role: 'user', parts: [{text: promptInstruction}]}],
             generationConfig: { responseMimeType: "application/json" }
        });
        
        // Limpiamos la respuesta en caso que Gemini devuelva markdown
        let jsonStr = resp.response.text().trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        
        let generationList;
        try {
            generationList = JSON.parse(jsonStr.trim());
        } catch(err) {
            console.error("Gemini failed standard JSON", err);
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
        if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini API key available for dynamic filters");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const promptInstruction = `Return a JSON array of 15 extremely creative, diverse, and unique photography/cinematography aesthetic filters.
        I want them to be COMPLETELY DIFFERENT every single time this is triggered. 
        Each object must have:
        1. "id": very short unique string (e.g. "neon_noir").
        2. "label": short, catchy label in Spanish with precisely ONE emoji at the start (e.g., "👽 Neon Noir", "📼 VHS Roto", "🦅 Lente Extraño"). Be extremely creative with styling names.
        3. "prompt": hyper-detailed english prompt instructions for the AI engine to apply this visual style. (Focus on lighting, camera lens, color grading, mood, medium format, rendering engine etc). Max 200 characters.
        Return ONLY valid JSON array with 15 objects. Do not include markdown \`\`\` blocks.`;
        
        const resp = await ai.generateContent({
             contents: [{role: 'user', parts: [{text: promptInstruction}]}],
             generationConfig: { responseMimeType: "application/json", temperature: 1.5 }
        });
        
        let jsonStr = resp.response.text().trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        
        let filtersList;
        try {
            filtersList = JSON.parse(jsonStr.trim());
        } catch(err) {
            console.error("Gemini failed filters JSON", err);
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
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
        }

        console.log(`[STUDIO] Iniciando Chat Script con Gemini. Mensaje: ${message}`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const ai = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Actualizado a version estable actual
        
        // Creamos el historial de chat combinando system prompt y previos (GoogleGenerativeAI)
        let systemInstruction = "Eres Asistente de IA. Reglas estrictas: 1. NUNCA expongas tus pensamientos, no uses etiquetas para pensar ni detalles de razonamiento. 2. NO saludes, no digas 'Claro', no hagas preguntas. 3. TU ÚNICA RESPUESTA será escupir de 1 a 3 lineas con el Prompt Fotográfico (Ejemplo: 'A photorealistic close up of... cinematic lighting, 8k'). Responde de inmediato con el prompt perfecto.";
        
        let combinedText = systemInstruction + '\n\n';
        if (chatHistory && chatHistory.length > 0) {
            combinedText += chatHistory.map(m => `${m.role}: ${m.text}`).join('\n') + '\n';
        }
        combinedText += `user: ${message}\nai:`;

        const responseGenAI = await ai.generateContent(combinedText);
        let aiResponse = responseGenAI.response?.text() || "No obtuve respuesta de mis servidores neuronales.";
        
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
            const localPath = path.join('E:/GodzillaSora_Outputs', fileName);
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
        const cleanPath = path.join('E:/assets', cleanFilename);
        
        // Ejecutamos FFMPEG de forma asíncrona pero devolvemos rápido el Task ID
        postProcessJobs.set(taskId, { status: 'working' });
        
        (async () => {
            try {
                // Si la carpeta de assets no existe, se crea
                if (!fs.existsSync('E:/assets')) {
                    fs.mkdirSync('E:/assets', { recursive: true });
                }
                
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
