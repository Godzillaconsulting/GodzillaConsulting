import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});
import pool from '../server/config/db.js';
const mediaPayload = {
    source: 'automation_tiktok_viral',
    scenes: {
        'VISUAL ESCENA 1 (Prompt Imagen Detallado)': 'Plano cerrado de un joven empresario sorprendido mirando su smartphone, luz de neón azul y morada, estilo cinemático ultra realista 8k, fondo desenfocado.',
        'NARRACION ESCENA 1': 'Deja de usar ChatGPT como un novato. Si tienes un negocio, estás perdiendo dinero.',
        'VISUAL ESCENA 2 (Prompt Imagen Detallado)': 'Un holograma futurista mostrando gráficos de ventas subiendo como un cohete, colores vibrantes, estilo tech startup.',
        'NARRACION ESCENA 2': 'Existe una inteligencia artificial oculta que automatiza todas tus ventas mientras duermes. Sí, escuchaste bien.',
        'VISUAL ESCENA 3 (Prompt Imagen Detallado)': 'Cerebro de cristal iluminado con conexiones neuronales de fibra óptica, render 3D hiperdetallado, ambiente de laboratorio tecnológico.',
        'NARRACION ESCENA 3 (CTA)': 'Comenta la palabra VIRAL y te envío el enlace por mensaje privado ahora mismo. ¡Sígueme para más secretos de IA!'
    },
    voice: 'edge:es-MX-DaliaNeural',
    niche: 'B2B Tech',
    sceneCount: 3
};

const title = '🔥 TIKTOK VIRAL: El secreto de ChatGPT para Negocios';
const promptText = 'HOOK: Deja de usar ChatGPT como novato...\n\nEsta IA oculta automatiza tus ventas mientras duermes. Comenta VIRAL y te la envío por DM. 🚀\n\n#ChatGPT #InteligenciaArtificial #Emprendedores #NegociosOnline #Automatizacion';

const query = `
    INSERT INTO studio_tasks 
    (title, prompt, status, assigned_to, media_payload, publish_targets, content_type, created_by, priority)
    VALUES ($1, $2, 'pending_render', 'Godzilla Engine', $3, $4, 'Video Corto', 'Automático (Viral Factory)', 'Alta')
    RETURNING id;
`;

pool.query(query, [
    title,
    promptText,
    JSON.stringify(mediaPayload),
    JSON.stringify(['tiktok']),
])
.then(r => {
    console.log('✅ Tarea de TikTok inyectada con éxito! ID:', r.rows[0].id);
    process.exit(0);
})
.catch(e => {
    console.error('Error inyectando tarea:', e);
    process.exit(1);
});
