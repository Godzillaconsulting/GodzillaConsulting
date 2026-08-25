import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import nodemailer from 'nodemailer';

const execPromise = util.promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reuse Gemini API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEMP_DIR = path.join(__dirname, '../../public/temp_social');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export async function generateDailySocialMediaAssets(pdfSections) {
    console.log("🎨 Iniciando Generación de Imágenes para Redes Sociales...");
    if (!pdfSections || pdfSections.length === 0) return;
    
    const fetch = (await import('node-fetch')).default;
    const { executeAiWaterfall } = await import('../utils/aiWaterfall.js');

    // Tomar máximo 4 noticias
    const sections = pdfSections.slice(0, 4);
    const renderItems = [];
    
    for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        console.log(`   Procesando noticia ${i+1}: ${sec.heading}`);
        
        try {
            // ── PASO 1: TEXTO SOCIAL ─────────────────────────────────────────
            // Usa la cascada Open Source primero (Groq → SambaNova → Cerebras → Gemini)
            // para NO gastar tokens de Gemini en tareas de copywriting repetitivas.
            const textPrompt = `Eres un analista experto en redes sociales corporativas. Tenemos esta noticia de IA:
Título: ${sec.heading}
Contenido: ${(sec.content || '').substring(0, 800)}

Devuelve un JSON estrictamente válido con 2 campos:
1. "socialText": Texto IMPACTANTE y DENSO de EXACTAMENTE 25-35 palabras. Estructura: [CONTEXTO FUERTE] + [DATO DURO/MÉTRICA REAL] + [CONSECUENCIA]. Sin frases genéricas. Encierra 1-2 palabras clave entre <color> y </color>.
2. "imagePrompt": Prompt en inglés para imagen fotográfica hiperrealista estilo TIME magazine. Escena concreta y real relacionada directamente al tema (${sec.heading}). Sin texto, sin letras, sin ciencia ficción. Fotografía editorial limpia, bien iluminada.`;

            let data;
            try {
                // CASCADA: Groq primero → SambaNova → Cerebras → Gemini como último recurso
                const waterfallRes = await executeAiWaterfall([
                    { role: 'system', content: 'Eres un experto en marketing de tecnología. Responde SOLO con JSON puro válido, sin markdown.' },
                    { role: 'user', content: textPrompt }
                ], { mode: 'noTools', jsonMode: true, temperature: 0.5, maxTokens: 512 });
                
                let raw = waterfallRes.content || '';
                const s = raw.indexOf('{'); const e = raw.lastIndexOf('}');
                if (s !== -1 && e !== -1) raw = raw.substring(s, e+1);
                data = JSON.parse(raw);
                console.log(`   ✅ Texto social generado vía cascada open source.`);
            } catch (textErr) {
                console.error(`   ⚠️ Cascada de texto falló: ${textErr.message}. Usando texto de emergencia.`);
                data = {
                    socialText: `<color>${sec.heading.toUpperCase().substring(0, 40)}</color>. NUEVO DESARROLLO EN INTELIGENCIA ARTIFICIAL QUE CAMBIA LAS REGLAS DEL JUEGO PARA EMPRESAS Y GOBIERNOS.`,
                    imagePrompt: `Editorial TIME magazine photo: ${sec.heading}, photorealistic, corporate, clean lighting, no text`
                };
            }
            
            // ── PASO 2: OBTENCIÓN DE FOTOGRAFÍA REAL DE ALTA RESOLUCIÓN Y ALTA RELEVANCIA ──
            console.log(`   📸 Asignando fotografía real representativa para noticia ${i+1}...`);
            let buffer;
            let imgFetched = false;

            const fullText = (sec.heading + " " + (sec.content || '')).toLowerCase();

            // Mapeo Universal de 9 Categorías Tecnológicas para Cualquier Noticia Futura
            const curatedPhotos = [
                {
                    // 1. Hardware, Microchips, GPUs, Procesadores, Semiconductores
                    match: (t) => t.includes('nvidia') || t.includes('amd') || t.includes('intel') || t.includes('gpu') || t.includes('microchip') || t.includes('procesador') || t.includes('semiconductor') || t.includes('alpamayo') || t.includes('cuántica') || t.includes('hardware'),
                    url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Hardware, Microchips & AI Processors'
                },
                {
                    // 2. Vehículos Autónomos, Robotaxis, Robótica, Drones
                    match: (t) => t.includes('robotaxi') || t.includes('autónomo') || t.includes('vehículo') || t.includes('robot') || t.includes('robotics') || t.includes('drone') || t.includes('tesla') || t.includes('waymo'),
                    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Autonomous Vehicles & Robotics'
                },
                {
                    // 3. Ciberseguridad, Hacking, Malware, Brechas, Defensa
                    match: (t) => t.includes('ciberseguridad') || t.includes('cybersecurity') || t.includes('hack') || t.includes('malware') || t.includes('virus') || t.includes('brecha') || t.includes('defensa') || t.includes('seguridad digital'),
                    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Cybersecurity & Defense'
                },
                {
                    // 4. Cloud Computing, Servidores, Datacenters, Infraestructura
                    match: (t) => t.includes('anthropic') || t.includes('nube') || t.includes('cloud') || t.includes('datacenter') || t.includes('servidor') || t.includes('aws') || t.includes('azure') || t.includes('supercomputadora'),
                    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Cloud Computing & Datacenters'
                },
                {
                    // 5. Casos Judiciales, Demandas, Secretos Comerciales, Regulaciones
                    match: (t) => t.includes('orden judicial') || t.includes('secretos') || t.includes('juicio') || t.includes('lawsuit') || t.includes('demanda') || t.includes('tribunal') || t.includes('corte') || t.includes('ley') || t.includes('patente'),
                    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Corporate Legal & Lawsuits'
                },
                {
                    // 6. Salud, Medicina, Biotecnología, Diagnóstico IA
                    match: (t) => t.includes('salud') || t.includes('medicina') || t.includes('médico') || t.includes('biotech') || t.includes('hospital') || t.includes('fármaco') || t.includes('genoma') || t.includes('cáncer'),
                    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'AI Healthcare & Biotech'
                },
                {
                    // 7. Universidades, Educación, Investigación, Fuerza Laboral
                    match: (t) => t.includes('universidad') || t.includes('educación') || t.includes('escuela') || t.includes('estudiantes') || t.includes('fuerza laboral') || t.includes('investigación') || t.includes('campus'),
                    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'University & AI Education'
                },
                {
                    // 8. Fintech, Banca, Inversiones, Startups, Economía
                    match: (t) => t.includes('fintech') || t.includes('banca') || t.includes('inversión') || t.includes('startup') || t.includes('finanzas') || t.includes('mercado') || t.includes('cripto') || t.includes('bitcoin'),
                    url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Fintech & Tech Business'
                },
                {
                    // 9. Aeroespacial, Satélites, Espacio
                    match: (t) => t.includes('espacio') || t.includes('satélite') || t.includes('spacex') || t.includes('nasa') || t.includes('cohete') || t.includes('órbita'),
                    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&h=1350&q=80',
                    tag: 'Aerospace & Satellites'
                }
            ];

            let selectedPhoto = curatedPhotos.find(p => p.match(fullText));
            let photoUrl = selectedPhoto ? selectedPhoto.url : 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1080&h=1350&q=80';
            let photoTag = selectedPhoto ? selectedPhoto.tag : 'Editorial Tech Background';

            try {
                console.log(`   📸 Descargando foto real HD para [${photoTag}]...`);
                const photoRes = await fetch(photoUrl, { timeout: 20000, redirect: 'follow' });
                if (photoRes.ok) {
                    const arrayBuf = await photoRes.arrayBuffer();
                    buffer = Buffer.from(arrayBuf);
                    if (buffer.length > 10000) {
                        console.log(`   ✅ Foto real HD descargada para Noticia ${i+1} (${(buffer.length/1024).toFixed(0)} KB)`);
                        imgFetched = true;
                    }
                }
            } catch (uErr) {
                console.warn(`   ⚠️ Falló descarga de Unsplash HD para noticia ${i+1}: ${uErr.message}`);
            }

            // Intento 3: Pollinations photorealistic (Fallback si no hay API de fotos gratis conectada)
            if (!imgFetched) {
                const baseStr = (data.imagePrompt || sec.heading).replace(/['"]/g, '').substring(0, 100);
                const safePrompt = `${baseStr}, photorealistic, editorial photo, no text`;
                
                const pollinationsModels = [
                    { model: 'flux-realism', prompt: safePrompt },
                    { model: 'flux',         prompt: safePrompt },
                    { model: 'turbo',        prompt: `${sec.heading.substring(0, 80)}, professional photo, no text` }
                ];
                
                for (const { model, prompt: pPrompt } of pollinationsModels) {
                    try {
                        const encoded = encodeURIComponent(pPrompt);
                        const imgUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1350&nologo=true&model=${model}&seed=${Date.now() % 99999}`;
                        console.log(`   🌐 Pollinations [${model}] prompt(${pPrompt.length}c): ${imgUrl.substring(0, 100)}...`);
                        const imgRes = await fetch(imgUrl, { timeout: 60000 });
                        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
                        const arrayBuf = await imgRes.arrayBuffer();
                        buffer = Buffer.from(arrayBuf);
                        if (buffer.length < 10000) throw new Error(`Imagen vacía (${buffer.length} bytes)`);
                        console.log(`   ✅ Foto fotorrealista descargada [${model}]: ${(buffer.length / 1024).toFixed(0)} KB`);
                        imgFetched = true;
                        break;
                    } catch (pollErr) {
                        console.warn(`   ⚠️ Pollinations [${model}] falló: ${pollErr.message}`);
                    }
                }
            }

            // Intento 4: Gemini Imagen como último recurso
            if (!imgFetched) {
                console.log(`   🔄 Intentando Gemini Imagen como último recurso...`);
                try {
                    const basePrompt = (data.imagePrompt || sec.heading).substring(0, 200);
                    const imgRes = await ai.models.generateImages({
                        model: 'imagen-3.0-generate-002',
                        prompt: basePrompt,
                        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '3:4' }
                    });
                    if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
                        buffer = Buffer.from(imgRes.generatedImages[0].image.imageBytes, 'base64');
                        console.log(`   ✅ Imagen generada con Gemini Imagen.`);
                        imgFetched = true;
                    }
                } catch (gemImgErr) {
                    console.warn(`   ⚠️ Gemini Imagen falló: ${gemImgErr.message}`);
                }
            }
            
            if (!imgFetched || !buffer) {
                console.error(`   ❌ No se pudo obtener imagen para noticia ${i+1}. Saltando.`);
                continue;
            }
            
            const baseImgPath = path.join(TEMP_DIR, `base_${i}.jpg`);
            const outImgPath = path.join(TEMP_DIR, `final_${i}.jpg`);
            fs.writeFileSync(baseImgPath, buffer);
            
            renderItems.push({
                baseImagePath: baseImgPath,
                outPath: outImgPath,
                text: data.socialText || sec.heading.toUpperCase(),
                color: "#CC0000"
            });
            
        } catch (err) {
            console.error(`❌ Error en noticia ${i+1}:`, err.message);
        }
    }
    
    if (renderItems.length === 0) return;
    
    // 3. Escribir JSON y ejecutar Python
    const jsonPath = path.join(TEMP_DIR, 'render_data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(renderItems, null, 2));
    
    console.log(`   🐍 Ejecutando motor de renderizado Python...`);
    const pyScript = path.join(__dirname, '../scripts/render_social.py');
    try {
        const { stdout, stderr } = await execPromise(`python "${pyScript}" "${jsonPath}"`);
        if (stderr) console.error("   ⚠️ Python stderr:", stderr);
        console.log("   ✅ Renderizado completado.");
    } catch (e) {
        console.error("   ❌ Error ejecutando Python:", e);
        return;
    }
    
    // 4. Enviar por correo
    console.log(`   📧 Enviando correo a godzilladiseno@gmail.com...`);
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SMTP_HOST || 'smtp-relay.brevo.com',
        port: process.env.EMAIL_SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS
        }
    });

    // Formato fecha DD_MM_YYYY
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`;

    const attachments = renderItems.map((item, idx) => ({
        filename: `info_${idx+1}_${dateStr}.jpg`,
        path: item.outPath
    }));

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Godzilla Consulting'}" <${process.env.EMAIL_FROM_ADDRESS || 'info@godzillaconsulting.ai'}>`,
        to: 'godzilladiseno@gmail.com',
        subject: 'Nuevas Imágenes Diarias para Redes Sociales (IA)',
        html: '<p>Aquí están las imágenes generadas automáticamente a partir de las noticias del boletín de hoy. Listas para publicar.</p>',
        attachments
    };

    const sendSocialEmail = async (attempt = 1) => {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`   ✅ [Imágenes] Correo enviado con éxito a diseño (intento ${attempt}).`);
        } catch (e) {
            console.error(`   ❌ [Imágenes] Error enviando correo (intento ${attempt}): ${e.message}`);
            console.error(`   ❌ [Imágenes] SMTP Config — host: ${process.env.EMAIL_SMTP_HOST}, port: ${process.env.EMAIL_SMTP_PORT}, user: ${process.env.EMAIL_USER}`);
            console.error(`   ❌ [Imágenes] Adjuntos: ${attachments.map(a => a.path).join(', ')}`);
            if (attempt < 3) {
                const delay = attempt * 30000; // 30s, 60s
                console.log(`   ⏳ [Imágenes] Reintentando en ${delay/1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                await sendSocialEmail(attempt + 1);
            } else {
                console.error('   💀 [Imágenes] Todos los intentos de correo fallaron. Imágenes guardadas en:', attachments.map(a => a.path));
            }
        }
    };

    await sendSocialEmail();
    
    try {
        for (const item of renderItems) {
            if (fs.existsSync(item.baseImagePath)) fs.unlinkSync(item.baseImagePath);
        }
    } catch(e) {}
}
