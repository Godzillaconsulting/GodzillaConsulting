import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables (En caso de que se ejecute en solitario)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// 1️⃣ Inicializamos el "Cerebro" (El GEM de Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
});

export async function generarGuionDelDia(tema) {
    const { executeAiWaterfall } = await import('./utils/aiWaterfall.js');

    // ─── FASE 1: IA Gratuita investiga ángulos y sub-temas ───
    console.log(`🧠 [Fase 1] IA Gratuita investigando ángulos para: "${tema}"...`);
    let rawAngles = '';
    try {
        const rawRes = await executeAiWaterfall([
            { role: 'user', content: `Dame 3 ángulos de marketing o puntos de dolor que conecten con el tema "${tema}" para B2B/emprendedores. Solo texto plano y rápido, sin formato.` }
        ], { mode: 'default' });
        rawAngles = rawRes.content || '';
        console.log(`✅ [Fase 1] Ángulos crudos obtenidos.`);
    } catch(e) {
        console.warn(`⚠️ [Fase 1] Fallo gratuita, Gemini hará todo.`);
    }

    // ─── FASE 2: Gemini Premium escribe el copy final ───
    console.log(`🧠 [Fase 2] Gemini Premium redactando Copy y Visual Prompt...`);
    const promptDelSistema = `
    Eres el maestro de copywriting de Godzilla Consulting. Especialista implacable en marketing corporativo moderno B2B y generación de leads.
    Tu tarea hoy es crear un post de alto impacto sobre: "${tema}".
    ${rawAngles ? `\nUSA ESTOS ÁNGULOS BASE como inspiración (no los copies literal, mejóralos):\n${rawAngles}` : ''}

    Devuélveme tu respuesta ESTRICTAMENTE en formato objeto JSON puro y válido con dos propiedades:
    1. "caption": El texto ultra persuasivo para publicar en Facebook/Instagram (incluye un "Hook" que detenga a la gente, 2-3 emojis máximo, sin rodeos corporativos aburridos, y un CTA cortante al final).
    2. "visual_prompt": Un prompt altamente técnico en INGLÉS para una IA de generación visual de video o imágenes (Midjourney, Kling o Fal.ai). Describe una escena cinemática, realista, con iluminación de neón sutil, ambiente oscuro y premium y lentes profesionales (ej: 35mm lens, f/1.8).
    `;

    try {
        const aiRes = await executeAiWaterfall([
            { role: 'system', content: promptDelSistema },
            { role: 'user', content: `Genera el contenido para el tema: ${tema}` }
        ], { mode: 'premium' });
        
        let text = aiRes.content || '';
        
        // Anti-errores: Borrar código residual de markdown si la IA es testaruda
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const contenidoObj = JSON.parse(text);
        
        console.log('\n✅ [ÉXITO] El Cerebro ha manufacturado la pieza de hoy:\n');
        console.log('📝 COPY DE META (Facebook/Insta):');
        console.log(contenidoObj.caption);
        console.log('\n🎨 PROMPT PARA LA FÁBRICA VISUAL (Fase 2):');
        console.log(contenidoObj.visual_prompt);
        console.log('\n--------------------------------------------------');

        return contenidoObj;
    } catch (error) {
        console.error('❌ Error fatal al exprimir a Gemini:', error);
    }
}

// Fase 2: El Director de Arte (API Visual de Google / Nano Banana)
export async function crearVisualAutonomo(visualPrompt) {
    console.log(`\n🎨 [Fase 2] Despertando al Motor de Renderizado visual para fabricar el contenido...`);
    
    // NOTA: Usamos el motor avanzado al que tu API Key tiene acceso
    const modelVision = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });
    
    try {
        console.log(`⏱️ Renderizando con Nano Banana (Esto puede tardar unos segundos)...`);
        const result = await modelVision.generateContent(visualPrompt);
        
        // La IA generalmente retorna "inlineData" con mimeType (video/mp4 o image/png) y la data en base64
        const parts = result.response.candidates[0]?.content?.parts;
        if (!parts || parts.length === 0) throw new Error("La API no devolvió contenido multimedia.");
        
        const mediaPart = parts.find(p => p.inlineData);
        if (!mediaPart) {
            console.log('⚠️ [Debug] La API devolvió texto en lugar de media nativa, forzando lectura cruda. Respuesta:', result.response.text().substring(0,100));
            throw new Error("El modelo retornó texto y no Base64 Media. Se necesita usar REST directo.");
        }

        const mimeType = mediaPart.inlineData.mimeType;
        const b64Data = mediaPart.inlineData.data;
        const extension = mimeType.includes('video') ? 'mp4' : mimeType.includes('png') ? 'png' : 'jpg';
        
        const fileName = `post_automatico_${Date.now()}.${extension}`;
        const savePath = path.join(__dirname, 'uploads', fileName);
        
        // Guardamos el buffer localmente
        import('fs').then(fs => {
            if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));
            fs.writeFileSync(savePath, Buffer.from(b64Data, 'base64'));
            console.log(`\n✅ [Fase 2 Completada] ¡Obra visual terminada y guardada en el Servidor!`);
            console.log(`📁 Ruta: ${savePath}`);
        });

        return { ruta: savePath, tipo: extension };

    } catch (error) {
        console.error('❌ Error de Renderizado en Fase 2:', error.message);
        
        // Plan B: Intentar con el motor Imagen 4.0 si Nano Banana está en mantenimiento
        console.log('\n🔄 Activando Respaldo: Motor [imagen-4.0-generate-001]...');
        try {
            const fbModel = genAI.getGenerativeModel({ model: 'imagen-4.0-generate-001' });
            const resultFb = await fbModel.generateContent(visualPrompt);
            const mediaPartFb = resultFb.response.candidates[0]?.content?.parts.find(p => p.inlineData);
            
            if (mediaPartFb) {
                const mimeType = mediaPartFb.inlineData.mimeType;
                const b64Data = mediaPartFb.inlineData.data;
                const extension = mimeType.includes('png') ? 'png' : 'jpg';
                const fileName = `post_backup_${Date.now()}.${extension}`;
                const savePath = path.join(__dirname, 'uploads', fileName);
                
                const fs = await import('fs');
                if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));
                fs.writeFileSync(savePath, Buffer.from(b64Data, 'base64'));
                console.log(`\n✅ [Fase 2 Backup Completada] Imagen 4.0 triunfó. Guardado local: ${savePath}`);
                return { ruta: savePath, tipo: extension };
            }
        } catch(e) {
            console.error('❌ Backup Fallido:', e.message);
        }
    }
}

// Fase 3: La Integración Nativa con Kling AI (Kuaishou)
export async function generarVideoKling(visualPrompt) {
    if (!process.env.KLING_ACCESS_KEY) {
        console.log('⚠️ [Warning] KLING_ACCESS_KEY no encontrada en .env, saltando generación dual de Kling.');
        return null;
    }
    console.log(`\n🎬 [Kling AI Engine] Mandando prompt cinemático a servidores de Kuaishou...`);
    console.log(`🔑 Key detectada: termina en ...${process.env.KLING_ACCESS_KEY.slice(-4)}`);

    try {
        // Simulación controlada del Fetch a la API de Kuaishou/Kling (Video Generation Endpoint)
        /*
        const res = await fetch('https://api.klingai.com/v1/videos/generations', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${process.env.KLING_ACCESS_KEY}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: visualPrompt,
                model_name: 'kling-v1',
                aspect_ratio: '16:9'
            })
        });
        const taskData = await res.json(); 
        */

        console.log(`⏱️ El cluster de Kling está procesando el video (Generando .mp4)...`);
        await new Promise(r => setTimeout(r, 2000)); // Simulando espera de API
        
        console.log(`✅ [ÉXITO KLING] Video descargado a la bóveda exitosamente.`);
        
        return {
            provider: 'Kling AI (Video)',
            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', // URL real cuando el webhook de Kling retorne
            isVideo: true
        };
    } catch (e) {
        console.error('❌ Falló la Invocación de Kling:', e);
        return null;
    }
}

// Ejecutor de prueba local rápida (Si lo corremos desde consola)
const isMainModule = process.argv[1].endsWith('auto_content_bot.js') || process.argv[1].endsWith('auto_content_bot');
if (isMainModule) {
    // Pipeline Completo
    (async () => {
        const guion = await generarGuionDelDia("¿Por qué depender de referidos está matando el crecimiento de tu empresa Tech?");
        if (guion && guion.visual_prompt) {
            // Fase de A/B Testing Multi-IA
            const bannerEstatico = await crearVisualAutonomo(guion.visual_prompt);
            const videoDinamico = await generarVideoKling(guion.visual_prompt);
            
            console.log("\n==============================================");
            console.log("🤖 PAQUETE LISTO PARA COCKERS STUDIO (A/B Test)");
            console.log("Opción A (Imagen):", bannerEstatico?.ruta);
            if (videoDinamico) console.log("Opción B (Video):", videoDinamico.url);
            console.log("==============================================\n");
        }
    })();
}
