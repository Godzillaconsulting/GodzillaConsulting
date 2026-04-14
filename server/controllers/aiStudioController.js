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
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const aiDirector = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                let instruction = '';
                if (engine.includes('Sora')) {
                    instruction = `You are an expert Photography Director. Translate this concept into an advanced technical prompt in ENGLISH for Stable Diffusion. Use extreme perspectives, experimental angles or asymmetric compositions. Respond ONLY with the prompt: ${prompt}`;
                } else if (engine.includes('Google Imagen') || engine.includes('Google Vision')) {
                    instruction = `You are a commercial photography director. Translate this concept into a detailed photographic direction prompt in English. Focus on lighting, composition, mood and technical camera details. Respond ONLY with the prompt, no preamble: ${prompt}`;
                }

                if (instruction) {
                    const translation = await aiDirector.generateContent(instruction);
                    if (translation && translation.response) {
                        optimizedPrompt = translation.response.text().trim();
                        console.log(`[AI DIRECTOR] Prompt derivado para ${engine}:\n${optimizedPrompt}`);
                    }
                }
            }
        } catch (dirErr) {
            console.log(`[AI DIRECTOR] Error traduciendo, fallback al original: ${dirErr.message}`);
        }

        // Mapeo rudimentario de aspecto de ratio de React a Kling API
        const arMapping = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
        
        let response;
        if (engine.includes('Sora')) {
            console.log(`[STUDIO] Despertando In-House GoTSora. Prompt optimizado: ${optimizedPrompt.substring(0, 50)}...`);
            try {
                // Fetch to local Node proxy (puerto 5000 directamente)
                const response = await fetch('http://127.0.0.1:5000/sora-start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                         prompt: optimizedPrompt,
                         mode: engine.includes('LCM') ? 'photo' : 'video',
                         diffusion_steps: 4,
                         ref_image: config.refImage || null
                    })
                });
                const data = await response.json();
                if (!data.success) throw new Error(data.error || "Falla en Local Backend");
                return res.status(200).json({ job_id: data.task_id, status: "processing", provider: engine });
            } catch (err) {
                 return res.status(400).json({ error: "Sora Cluster Apagado o Desconectado" });
            }
        } else if (engine.includes('Kling')) {
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

            // Importar IDs desde la v4 (purga automatizada de modelos V2)
            const veoModel = getModelId(engine) || 'veo-3.0-generate-001';
            console.log(`[VEO] Motor seleccionado: ${veoModel} (para engine UI: ${engine})`);

            (async () => {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const ratio = (config?.aspect_ratio === '9:16') ? '9:16' : '16:9';

                    let operation = await ai.models.generateVideos({
                        model: veoModel,
                        prompt: finalPromptToUse,
                        config: {
                            aspectRatio: ratio,
                            numberOfVideos: 1
                        }
                    });

                    // Poll hasta que la operación long-running termine
                    let attempts = 0;
                    while (!operation.done && attempts < 60) {
                        await new Promise(r => setTimeout(r, 10000)); // espera 10s
                        operation = await ai.operations.getVideosOperation({ operation });
                        attempts++;
                        postProcessJobs.set(taskId, { status: 'working', progress: Math.min(5 + attempts * 1.5, 90) });
                        console.log(`[VEO] Polling ${veoModel} - intento ${attempts} - done: ${operation.done}`);
                    }

                    if (!operation.done || !operation.response?.generatedVideos?.[0]?.video?.uri) {
                        throw new Error(`${veoModel}: Timeout o sin URI de video en la respuesta.`);
                    }

                    const videoUri = operation.response.generatedVideos[0].video.uri;
                    console.log(`[VEO] ✅ Video URI recibida: ${videoUri.substring(0, 60)}...`);

                    // Descargar el video binario y guardarlo en disco para servir localmente
                    const videoDir = 'E:/GodzillaSora_Outputs';
                    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
                    const videoPath = path.join(videoDir, `${taskId}.mp4`);

                    // El URI de Google requiere el API Key para descargarse
                    const dlRes = await fetch(`${videoUri}&key=${process.env.GEMINI_API_KEY}`);
                    if (!dlRes.ok) throw new Error(`Fallo descarga video: HTTP ${dlRes.status}`);
                    const arrBuf = await dlRes.arrayBuffer();
                    fs.writeFileSync(videoPath, Buffer.from(arrBuf));

                    const localUrl = `/api/sora/media/${taskId}.mp4`;
                    postProcessJobs.set(taskId, { status: 'done', localUrl });
                    console.log(`[VEO] 🎉 Video guardado: ${videoPath}`);

                } catch (e) {
                    console.error(`[VEO] ❌ Error (${engine}):`, e.message);
                    postProcessJobs.set(taskId, { status: 'failed', error: e.message });
                }
            })();

            return res.status(200).json({ job_id: taskId, status: 'processing', provider: engine });

        } else if (engine.includes('Luma') || engine.includes('Runway')) {
            // Future-proofing for Runway Gen-3 and Luma Dream Machine
            return res.status(400).json({ error: "No cuentas con suscripción API Activa para Luma o Runway." });
        } else if (engine.includes('Higgsfield')) {
            if (!process.env.HIGGSFIELD_API_KEY) {
                return res.status(400).json({ error: "La conexión API hacia Higgsfield Cosmos requiere tu llave de desarrollador. Agrégala a las variables de entorno (.env)." });
            }
            
            const taskId = 'higgsfield_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            postProcessJobs.set(taskId, { status: 'working', progress: 0 });
            
            (async () => {
                try {
                    const finalPromptToUse = optimizedPrompt || prompt;
                    console.log(`[STUDIO] Activando Higgsfield AI Cosmos API...`);

                    // Endpoint correcto de Higgsfield para text-to-video
                    const hBody = {
                        model: engine.includes('Fast') ? 'higgsfield-fast' : 'cosmos',
                        prompt: finalPromptToUse,
                        duration: config?.duration || 5,
                        aspect_ratio: config?.aspect_ratio || '16:9'
                    };

                    const hRes = await fetch('https://api.higgsfield.ai/v1/generation/text-to-video', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.HIGGSFIELD_API_KEY}`
                        },
                        body: JSON.stringify(hBody)
                    });
                    const hData = await hRes.json();
                    if (!hRes.ok) throw new Error(hData.error?.message || hData.message || hData.detail || "Error Higgsfield");

                    // Higgsfield devuelve id del job
                    const jobId = hData.id || hData.task_id || hData.request_id;
                    if (!jobId) throw new Error('Higgsfield no devolvió un job ID válido');

                    postProcessJobs.set(taskId, { status: 'delegated', provider_job_id: jobId });
                    console.log(`[HIGGSFIELD] ✅ Job creado: ${jobId}`);
                } catch (e) {
                    console.error("[HIGGSFIELD] ❌ Error:", e.message);
                    postProcessJobs.set(taskId, { status: 'failed', error: e.message });
                }
            })();
            
            return res.status(200).json({ job_id: taskId, status: 'processing', provider: engine });
            
        } else {
            // Generadores de Imágenes AI NATIVOS usando Google GenAI (Gemini Image Models)
            const targetModel = engine.includes('Imagen 3.0') ? 'gemini-3.1-flash-image-preview' : 'gemini-2.0-flash'; // 2.0-flash will not natively output images via simple SDK call without special arguments, falling back.
            console.log(`[STUDIO] Generando Foto Comercial simulando llamada Google. Prompt: ${prompt}`);
            
            if (!process.env.GEMINI_API_KEY) {
                return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
            }

            // Nativamente utilizamos la API Top de Google (Gemini Image Models)
            const taskId = 'googleimg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            postProcessJobs.set(taskId, { status: 'working', progress: 0 });

            // Proceso asíncrono robusto con SDK nuevo (@google/genai >= 1.0)
            (async () => {
                try {
                    const finalPromptToUse = optimizedPrompt || prompt;

                    // Shortcut para generación 100% nativa LCM (GotSora 6to Modelo)
                    if (engine === 'GotSora (T2I Local)') {
                        console.log(`[STUDIO] Activando Motor GPU Local (GotSora T2I)...`);
                        const localRes = await fetch('http://127.0.0.1:5000/sora-start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                prompt: finalPromptToUse,
                                mode: 'photo',
                                diffusion_steps: 4,
                                input_image: config?.refImage || null
                            })
                        });
                        const localData = await localRes.json();
                        if (localData.success) {
                            postProcessJobs.set(taskId, { status: 'delegated', local_task_id: localData.task_id });
                            return; // Terminamos aquí, sin usar Google.
                        } else {
                            throw new Error("Sora Engine Rejected: " + (localData.error || "Unknown"));
                        }
                    }

                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

                    // Motor EXACTO mapeado por nombre de UI a modelo real
                    const modelName = getModelId(engine) || 'gemini-3.1-flash-image-preview';

                    console.log(`[GOOGLE-VISION] Motor real: ${modelName} | Engine UI: ${engine} | Prompt: ${finalPromptToUse.substring(0, 80)}...`);

                    let resultUrl = null;

                    if (modelName.startsWith('imagen')) {
                        // Imagen 4: usa generateImages del SDK @google/genai
                        const response = await ai.models.generateImages({
                            model: modelName,
                            prompt: finalPromptToUse,
                            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
                        });
                        if (response.generatedImages?.[0]?.image?.imageBytes) {
                            const b64 = response.generatedImages[0].image.imageBytes;
                            resultUrl = `data:image/jpeg;base64,${b64}`;
                        }
                    } else {
                        // Gemini 3 Pro Image / Gemini 3.1 Flash Image — generateContent + responseModalities
                        const contentPayload = config?.refImage && typeof config.refImage === 'string' && config.refImage.startsWith('data:')
                            ? [
                                { inlineData: { mimeType: config.refImage.split(';')[0].split(':')[1], data: config.refImage.split(',')[1] } },
                                { text: finalPromptToUse }
                              ]
                            : [{ text: finalPromptToUse }];

                        const response = await ai.models.generateContent({
                            model: modelName,
                            contents: [{ role: 'user', parts: contentPayload }],
                            config: { responseModalities: ['TEXT', 'IMAGE'] }
                        });

                        for (const part of (response.candidates?.[0]?.content?.parts || [])) {
                            if (part.inlineData?.data) {
                                const mime = part.inlineData.mimeType || 'image/png';
                                resultUrl = `data:${mime};base64,${part.inlineData.data}`;
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
                    const usedPrompt = finalPromptToUse || prompt;
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
            } else if (job.status === 'delegated') {
                try {
                    const lres = await fetch(`http://127.0.0.1:5000/sora-status/${job.local_task_id}`);
                    const ldata = await lres.json();
                    if (ldata.status === 'succeed') {
                        let soraUrl = ldata.result_url;
                        if (!soraUrl.startsWith('http')) soraUrl = 'http://127.0.0.1:5000' + soraUrl; // Asegurar full url
                        
                        try {
                            const imgRes = await fetch(soraUrl);
                            const arrBuf = await imgRes.arrayBuffer();
                            const buffer = Buffer.from(arrBuf);
                            
                            const saveDir = 'E:/GodzillaSora_Outputs';
                            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
                            const filename = `gotsora_refined_${Date.now()}.jpg`;
                            fs.writeFileSync(path.join(saveDir, filename), buffer);
                            
                            const localUrl = `/api/sora/media/${filename}`;
                            postProcessJobs.delete(taskId);
                            return res.status(200).json({ task_id: taskId, status: 'succeed', progress: 100, result_url: localUrl });
                        } catch (saveErr) {
                            postProcessJobs.delete(taskId);
                            return res.status(200).json({ status: 'failed', error: "Fallo guardando a E: " + saveErr.message });
                        }
                    } else if (ldata.status === 'failed') {
                        postProcessJobs.delete(taskId);
                        return res.status(200).json({ status: 'failed', error: ldata.error || "Falla en Local Engine GPU." });
                    } else {
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: ldata.progress || 50, result_url: '' });
                    }
                } catch(pe) {
                    // Retry mode silenciador
                    return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                }
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
            } else if (job.status === 'delegated') {
                try {
                    const lres = await fetch(`http://127.0.0.1:5000/sora-status/${job.local_task_id}`);
                    const ldata = await lres.json();
                    if (ldata.status === 'succeed') {
                        postProcessJobs.delete(taskId);
                        let soraUrl = ldata.result_url;
                        if (soraUrl.startsWith('/outputs/')) soraUrl = `/api/sora/media/${soraUrl.replace('/outputs/', '')}`;
                        else if (!soraUrl.startsWith('http') && !soraUrl.startsWith('/api')) soraUrl = `/api/sora/media/${soraUrl}`;
                        return res.status(200).json({ task_id: taskId, status: 'succeed', progress: 100, result_url: soraUrl });
                    } else if (ldata.status === 'failed') {
                        postProcessJobs.delete(taskId);
                        return res.status(200).json({ status: 'failed', error: ldata.error || "Falla en Local Engine GPU." });
                    } else {
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: ldata.progress || 50, result_url: '' });
                    }
                } catch(pe) {
                    return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                }
            } else {
                return res.status(200).json({
                    task_id: taskId,
                    status: 'processing',
                    progress: job.progress || 50,
                    result_url: ''
                });
            }
        }
        // Manejar Higgsfield Cosmos Video Jobs guardados en Server RAM
        if (taskId.startsWith("higgsfield_")) {
            const job = postProcessJobs.get(taskId);
            if (!job) {
                return res.status(400).json({ error: "Job de Higgsfield expirado o no existe en RAM" });
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
            } else if (job.status === 'delegated') {
                try {
                    const abortController = new AbortController();
                    const timeoutId = setTimeout(() => abortController.abort(), 3500);

                    const hRes = await fetch(`https://api.higgsfield.ai/v1/generations/${job.provider_job_id}`, {
                        headers: { 'Authorization': `Bearer ${process.env.HIGGSFIELD_API_KEY}` },
                        signal: abortController.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (hRes.status === 502 || hRes.status === 504) {
                        job.retries = (job.retries || 0) + 1;
                        if (job.retries > 5) {
                            job.status = 'failed';
                            job.error = "Higgsfield timeout (502). Múltiples reintentos fallidos.";
                            return res.status(200).json({ status: 'failed', error: job.error });
                        }
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                    }
                    
                    const hData = await hRes.json();
                    if (!hRes.ok) throw new Error(hData.error?.message || hData.message || hData.detail || "Polling fallido a Higgsfield");
                    
                    if (hData.state === 'completed' || hData.status === 'completed' || hData.status === 'succeed') {
                        const videoUrl = hData.video?.url || hData.output?.url || hData.url;
                        if (!videoUrl) throw new Error("Higgsfield finalizó pero no regresó URL de video");
                        
                        job.status = 'done';
                        job.localUrl = videoUrl;
                        return res.status(200).json({ task_id: taskId, status: 'succeed', progress: 100, result_url: videoUrl, isVideo: true });
                    } else if (hData.state === 'failed' || hData.status === 'failed' || hData.status === 'error') {
                        job.status = 'failed';
                        job.error = "Fallo interno en motor de Higgsfield: " + (hData.error?.message || "Error desconocido");
                        return res.status(200).json({ status: 'failed', error: job.error });
                    } else {
                        // Sigue procesando
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: hData.progress || 50, result_url: '' });
                    }
                } catch(pe) {
                    if (pe.name === 'AbortError') {
                        console.log("[HIGGSFIELD] Async Polling Timeout (3.5s). Retrying next cycle sin bloquear Node.");
                        return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                    }
                    console.error("Higgsfield Polling Error: ", pe);
                    return res.status(200).json({ task_id: taskId, status: 'processing', progress: 50, result_url: '' });
                }
            } else {
                return res.status(200).json({
                    task_id: taskId,
                    status: 'processing',
                    progress: job.progress || 10,
                    result_url: ''
                });
            }
        }
        
        // Manejar Sora In-House
        if (taskId.startsWith("sora_live_")) {
            try {
                const response = await fetch(`http://127.0.0.1:5000/sora-status/${taskId}`);
                const data = await response.json();
                if (data.status === 'succeed') {
                    let soraUrl = data.result_url;
                    if (soraUrl.startsWith('/outputs/')) {
                        soraUrl = `/api/sora/media/${soraUrl.replace('/outputs/', '')}`;
                    } else if (!soraUrl.startsWith('http') && !soraUrl.startsWith('/api')) {
                        soraUrl = `/api/sora/media/${soraUrl}`;
                    }

                    return res.status(200).json({
                        task_id: taskId,
                        status: 'succeed',
                        progress: 100,
                        result_url: soraUrl
                    });
                } else if (data.status === 'failed') {
                    return res.status(400).json({ error: data.error });
                } else {
                    return res.status(200).json({
                        task_id: taskId,
                        status: 'processing',
                        progress: data.progress || 10,
                        result_url: ''
                    });
                }
            } catch (err) {
                return res.status(400).json({ error: "Sora Offline" });
            }
        }

        if (taskId.startsWith("veo_")) {
            const rawOpName = taskId.replace("veo_", "");
            
            // Poll natively via Google REST as operations API is complex via direct fetch
            const apiKey = process.env.GEMINI_API_KEY;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${rawOpName}?key=${apiKey}`);
            const opData = await response.json();
            
            if (opData.error) {
                return res.status(400).json({ error: opData.error.message });
            }

            let status = 'processing';
            let outputUrl = '';
            
            if (opData.done) {
                status = 'succeed';
                if (opData.response && opData.response.generateVideoResponse) {
                     outputUrl = opData.response.generateVideoResponse.generatedSamples[0].video.uri;
                }
            }

            return res.status(200).json({
                task_id: taskId,
                status: status,
                progress: status === 'succeed' ? 100 : 50,
                result_url: outputUrl
            });
        }

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
        2. "tag": short catchy name in spanish (e.g. "Cyberpunk", "Macro Lente", "Cinemático").
        3. "model": randomly choose between "Imagen 4 Ultra", "Gemini 3 Pro", "GotSora T2I", "Higgsfield Cosmos".
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
        console.log(`[STUDIO] Iniciando Refinado GotSora para: ${imageUrl}`);

        let base64Image = null;
        let localDiskPath = null;
        if (imageUrl.startsWith('http')) {
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Garantizar escritura asincrona a Disco E: ANTES de notificar a GotSora
            const saveDir = 'E:/GodzillaSora_Outputs';
            if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
            localDiskPath = path.join(saveDir, `temp_refine_${Date.now()}.jpg`);
            fs.writeFileSync(localDiskPath, buffer);
            
            console.log(`[STUDIO] GotSora Sequence 1/2: Imagen Original 100% grabada en ${localDiskPath}`);

            // Seguimos enviando base64 si el UI así lo requiere, pero el pipeline 
            // ya asegura retención en disco para failsafes de RAM.
            base64Image = buffer.toString('base64');
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            base64Image = `data:${contentType};base64,${base64Image}`;
        }

        const optimizedPrompt = (prompt || 'high quality, masterpiece, 8k, raw photo, film grain') + ', Cinematic/Godzilla style, premium rendering';
        
        console.log(`[STUDIO] GotSora Sequence 2/2: Input a Engine. Tareas de render a iniciar.`);

        const response = await fetch('http://127.0.0.1:5000/sora-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 prompt: optimizedPrompt,
                 mode: 'photo',
                 diffusion_steps: 5,
                 ref_image: base64Image,
                 local_path: localDiskPath // Pasamos el hint al motor Python por si soporta optimizacion directa
            })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Falla en Local Backend GoTSora');

        const refineTaskId = "refine_" + data.task_id;
        postProcessJobs.set(refineTaskId, { status: 'delegated', local_task_id: data.task_id });

        return res.status(200).json({ job_id: refineTaskId, status: 'processing', provider: 'GotSora Refined' });

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
