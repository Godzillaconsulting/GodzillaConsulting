import pool from './server/config/db.js';
async function run() {
    try {
        const payload = {
            source: 'ai_planner',
            niche: 'Automatizacion B2B',
            month: 'Abril',
            year: 2026,
            scenes: {
                dia: 'Tendencia Flash',
                Tema: 'El fin de los DMs sin leer',
                'NARRACION ESCENA 1': 'El 90% de los negocios van a quebrar este ano.',
                'TEXTO EN PANTALLA ESCENA 1': '⚠️ 90% DE QUIEBRAS',
                'VISUAL ESCENA 1': 'Cinematic shot of a closed down office building with a For Lease sign, dark and moody, 4k, hyper-realistic.',
                'NARRACION ESCENA 2': 'Y la culpa la tienen los mensajes no leidos. Tardas horas en responder y el cliente se va.',
                'TEXTO EN PANTALLA ESCENA 2': 'CLIENTES PERDIDOS',
                'VISUAL ESCENA 2': 'Close up of an iPhone screen flooded with unread notifications, dark room glowing blue light.',
                'NARRACION ESCENA 3': 'Pero las agencias inteligentes estan instalando Empleados Fantasma.',
                'TEXTO EN PANTALLA ESCENA 3': 'EMPLEADOS FANTASMA',
                'VISUAL ESCENA 3': 'A glowing holographic AI brain floating above a sleek corporate desk.',
                'NARRACION ESCENA 4': 'Un bot que atiende 24/7 y te agenda las citas mientras duermes.',
                'TEXTO EN PANTALLA ESCENA 4': 'AGENDA LLENA',
                'VISUAL ESCENA 4': 'Google Calendar filling up rapidly with green blocks, fast motion.',
                'NARRACION ESCENA 5 (CTA)': 'Comenta SISTEMA y te mando el embudo por DM.',
                'TEXTO EN PANTALLA ESCENA 5': 'Comenta: SISTEMA',
                'VISUAL ESCENA 5': 'A cinematic text overlay saying SISTEMA over a blurred background of a busy tech city.'
            }
        };
        const query = `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, ig_publish_date, media_payload, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)`;
        const values = [
            '🔥 Tendencia B2B: Agentes Fantasma',
            'Escena 1: El 90% de los negocios van a quebrar este ano.\nEscena 2: Y la culpa la tienen los mensajes no leidos. Tardas horas en responder y el cliente se va.\nEscena 3: Pero las agencias inteligentes estan instalando Empleados Fantasma.\nEscena 4: Un bot que atiende 24/7 y te agenda las citas mientras duermes.\nEscena 5: Comenta SISTEMA y te mando el embudo por DM.',
            'auto',
            JSON.stringify(['Tendencias', 'auto']),
            'Alta',
            'pending',
            'Video Corto',
            JSON.stringify(payload),
            'Godzilla_admin'
        ];
        await pool.query(query, values);
        console.log('✅ Tarea insertada exitosamente en el CM.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
