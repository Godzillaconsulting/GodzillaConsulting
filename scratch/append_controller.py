import re

with open('server/controllers/aiStudioController.js', 'r', encoding='utf-8') as f:
    c = f.read()

new_content = """
export const purifyVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ningún archivo." });
        }
        
        console.log(`[STUDIO] Iniciando purificaci\u00f3n manual de video: ${req.file.filename}`);
        
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
                
                await removeWatermark(rawPath, cleanPath);
                
                // Limpiar el crudo suciote
                if(fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
                
                postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/videos/${cleanFilename}` });
                console.log(`[STUDIO] Purificaci\u00f3n manual exitosa.`);
            } catch (err) {
                console.error("[STUDIO] Fallo purificaci\u00f3n manual:", err);
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
"""

with open('server/controllers/aiStudioController.js', 'a', encoding='utf-8') as f:
    f.write(new_content)
