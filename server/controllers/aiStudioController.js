import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
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
        
        console.log(`[STUDIO] Iniciando Job en Engine Real: ${engine}`);

        // Mapeo rudimentario de aspecto de ratio de React a Kling API
        const arMapping = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
        
        let response;
        if (engine.includes('Video') || engine.includes('Kling')) {
            // Ejemplo de body para Text-To-Video Kling V1
            const requestBody = {
                model: "kling-v1",
                prompt: prompt || "cyberpunk shot",
                negative_prompt: config.negative || "",
                ratio: arMapping[config.aspect_ratio] || '16:9',
                duration: config.duration === '10' ? "10" : "5",
                mode: "standard" // standard o pro
            };

            response = await fetch('https://api.klingai.com/v1/videos/text2video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            // Generador de Imágenes AI NATIVO usando Google GenAI (Imagen 4.0)
            console.log(`[STUDIO] Generando Imagen con Google GenAI (Imagen 4.0). Prompt: ${prompt}`);
            
            if (!process.env.GEMINI_API_KEY) {
                return res.status(400).json({ error: "Llave GEMINI_API_KEY no configurada." });
            }

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            // Map React aspect ratios to Google Imagen aspect ratios
            const googleRatio = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:3': '4:3', '3:4': '3:4' }[config.aspect_ratio] || '16:9';

            const responseGenAI = await ai.models.generateImages({
                model: 'imagen-4.0-fast-generate-001',
                prompt: prompt || "A sleek cinematic render",
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: googleRatio
                }
            });

            if (!responseGenAI.generatedImages || responseGenAI.generatedImages.length === 0) {
                 return res.status(500).json({ error: "Google API no devolvió ninguna imagen." });
            }

            // Convert base64 bytes to a Data URI for immediate frontend rendering
            const base64Bytes = responseGenAI.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64Bytes}`;

            // Return synchronously because Imagen generation is fast enough via API
            return res.status(200).json({ 
                status: 'succeed', 
                job_id: "google_image_" + Date.now(),
                provider: engine,
                result_url: imageUrl
            });
        }

        const data = await response.json();
        
        if (!response.ok || data.code !== 0) {
            console.error("[STUDIO ERROR]", data);
            return res.status(400).json({ error: data.message || "Fallo en API de Proveedor" });
        }

        // Kling responde con el Task ID para poner en Queue
        return res.status(200).json({
            job_id: data.data.task_id,
            status: "processing",
            provider: engine
        });

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

        const token = generateKlingAuthToken();

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
