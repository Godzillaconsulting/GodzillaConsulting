import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
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
                const aiDirector = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                let instruction = '';
                if (engine.includes('Sora')) {
                    instruction = `Eres un Director de Fotografía experto. Traduce esta idea a un prompt técnico avanzado en INGLÉS para Stable Diffusion. El prompt debe ser muy distinto a una foto normal: usa perspectivas extremas, ángulos experimentales, vista de dron o composiciones asimétricas para darle un toque indie/vanguardista. Secuencia separada por comas (ej. 'raw photo, masterpiece, 8k, low angle shot, experimental lighting, moody...'). Solo responde el prompt: ${prompt}`;
                } else if (engine.includes('Imagen 3.0')) {
                    instruction = `Traduce este concepto a un prompt de dirección fotográfica en inglés. Enfócate en una estética premium y comercial: usa luces de estudio limpias, hora dorada, simetría perfecta, o close-ups detallados (macro). Que se sienta como una campaña publicitaria de alto presupuesto. Solo responde el prompt: ${prompt}`;
                } else if (engine.includes('Imagen 4.0')) {
                    instruction = `Crea un prompt vibrante en inglés para arte conceptual. Aléjate de lo mundano: usa paletas de colores inusuales (neón, pastel, monocromo con acento), estilos de renderización 3D (Unreal Engine, octane render) o composiciones dinámicas/surrealistas. Solo responde el prompt: ${prompt}`;
                }

                if (instruction) {
                    const translation = await aiDirector.models.generateContent({
                        model: 'gemini-2.5-pro',
                        contents: instruction
                    });
                    if (translation && translation.text) {
                        optimizedPrompt = translation.text.trim();
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

        } else if (engine.includes('Veo') || engine.includes('Video')) {
            console.log(`[STUDIO] Generando Video con Google Veo (3.1). Prompt: ${prompt}`);
            if (!process.env.GEMINI_API_KEY) return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            // Map React aspect ratios to Google Veo aspect ratios (Only 16:9 and 9:16 supported)
            let googleRatio = '16:9';
            if (config.aspect_ratio === '9:16' || config.aspect_ratio === '3:4') googleRatio = '9:16';
            
            try {
                const operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: optimizedPrompt || "Cinematic masterpiece",
                    config: {
                        numberOfVideos: 1,
                        aspectRatio: googleRatio
                    }
                });

                return res.status(200).json({ 
                    job_id: "veo_" + operation.name, 
                    status: "processing", 
                    provider: engine 
                });
            } catch (err) {
                console.error("[VEO] Error en generador de video:", err);
                return res.status(400).json({ error: "No se pudo generar video: " + err.message });
            }
        } else if (engine.includes('Luma') || engine.includes('Runway')) {
            // Future-proofing for Runway Gen-3 and Luma Dream Machine
            return res.status(400).json({ error: "No cuentas con suscripción API Activa para Luma o Runway (Gemini Plus no procesa Video nativo vía API). Agrega tus llaves en el servidor." });
        } else {
            // Generadores de Imágenes AI NATIVOS usando Google GenAI (Gemini Image Models)
            const targetModel = engine.includes('Imagen 3.0') ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
            console.log(`[STUDIO] Generando Foto Comercial con Google GenAI (${targetModel}). Prompt: ${prompt}`);
            
            if (!process.env.GEMINI_API_KEY) {
                return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
            }

            const aiImg = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            // Generar 3 imágenes en paralelo simulando `numberOfImages: 3` ya que generateContent a veces devuelve 1
            const tasks = Array.from({ length: 3 }, () => aiImg.models.generateContent({
                model: targetModel,
                contents: optimizedPrompt || "A sleek cinematic render for an ad",
                config: {
                    responseModalities: ["IMAGE"]
                }
            }));

            const responsesGenAI = await Promise.allSettled(tasks);
            
            // Filtrar las tareas exitosas y extraer la base64
            const generatedImages = [];
            responsesGenAI.forEach(result => {
                if(result.status === 'fulfilled') {
                    const parts = result.value.candidates?.[0]?.content?.parts;
                    const imgPart = parts ? parts.find(p => p.inlineData) : null;
                    if(imgPart) generatedImages.push(imgPart.inlineData.data);
                }
            });

            if (generatedImages.length === 0) {
                 return res.status(500).json({ error: "Google API no devolvió ninguna imagen tras 3 intentos." });
            }

            // Eliminado el guardado en disco para prevenir memory/disk leak en el VPS.
            // Las imágenes crudas en Base64 se envían directo al frontend para ser renderizadas
            // y solo se guardarán si el usuario da clic en "Descargar".
            const imageUrls = generatedImages.map(base64Bytes => `data:image/png;base64,${base64Bytes}`);

            // Return synchronously with the Base64 URLs so the UI handles them directly
            return res.status(200).json({ 
                status: 'succeed', 
                job_id: "google_image_" + Date.now(),
                provider: engine,
                result_url: imageUrls
            });
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const checkRenderStatus = async (req, res) => {
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
        let outputUrl = '';
        if (taskInfo.task_status === 'succeed' && taskInfo.task_result) {
            // Kling devuelve un array de videos generados
            outputUrl = taskInfo.task_result.videos[0].url;
        }

        return res.status(200).json({
            task_id: taskId,
            status: taskInfo.task_status,
            progress: taskInfo.task_status === 'succeed' ? 100 : 50,
            result_url: outputUrl
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

export const generateScriptChat = async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
        }

        console.log(`[STUDIO] Iniciando Chat Script con Gemini. Mensaje: ${message}`);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Creamos el historial de chat combinando system prompt y previos (GoogleGenAI SDK)
        let systemInstruction = "Eres un director creativo experto en copywriting y prompts de video. Sé muy agresivo para las conversiones y muy directo. Escribe siempre un Hook impactante, un Cuerpo directo y un CTA claro. Responde directamente con el guion pedido o la mejora. Usa máximo 2 párrafos.";
        
        let combinedText = systemInstruction + '\n\n';
        if (chatHistory && chatHistory.length > 0) {
            combinedText += chatHistory.map(m => `${m.role}: ${m.text}`).join('\n') + '\n';
        }
        combinedText += `user: ${message}\nai:`;

        const responseGenAI = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: combinedText
        });
        
        const aiResponse = responseGenAI.text || "No obtuve respuesta de mis servidores neuronales.";

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
        if (imageUrl.startsWith('http')) {
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            base64Image = Buffer.from(arrayBuffer).toString('base64');
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            base64Image = `data:${contentType};base64,${base64Image}`;
        }

        const response = await fetch('http://127.0.0.1:5000/sora-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 prompt: prompt || 'high quality, masterpiece, 8k, raw photo, film grain',
                 mode: 'photo',
                 diffusion_steps: 5,
                 ref_image: base64Image
            })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Falla en Local Backend GoTSora');

        return res.status(200).json({ job_id: data.task_id, status: 'processing', provider: 'GotSora Refined' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
