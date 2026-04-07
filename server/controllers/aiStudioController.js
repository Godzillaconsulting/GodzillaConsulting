import jwt from 'jsonwebtoken';

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
            // Generador de Imágenes AI (Usamos Pollinations.ai libre por ahora ya que Google Imagen 3 requiere Vertex AI o SDK nuevo)
            console.log(`[STUDIO] Generando Imagen con Prompt: ${prompt}`);
            
            // Calculamos resolución (Pollinations permite mandar w/h)
            let w = 1024, h = 1024;
            if (config.aspect_ratio === '16:9') { w = 1024; h = 576; }
            else if (config.aspect_ratio === '9:16') { w = 576; h = 1024; }
            else if (config.aspect_ratio === '4:3') { w = 1024; h = 768; }
            else if (config.aspect_ratio === '3:4') { w = 768; h = 1024; }

            const safePrompt = encodeURIComponent(prompt || "a beautiful generic landscape");
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;

            // Simulamos el task flow devolviendo success directo con la URL
            return res.status(200).json({ 
                status: 'succeed', 
                job_id: "image_direct_task_" + Date.now(),
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
