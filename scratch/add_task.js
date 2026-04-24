import pool from '../server/config/db.js';

(async () => {
    try {
        const payload = {
            scenes: {
                'VISUAL ESCENA 1 (Prompt Imagen Detallado)': 'Hyper-realistic cinematic shot of a foggy forest at night, GTA San Andreas style, spooky atmosphere, 8k resolution, mysterious shadows.',
                'NARRACION ESCENA 1': '¿Sabías que en Grand Theft Auto San Andreas existe un misterio que Rockstar ocultó durante años en el bosque?',
                'VISUAL ESCENA 2 (Prompt Imagen Detallado)': 'A rusty old wheelchair sitting alone at the edge of a creepy wooden dock over a dark lake at night.',
                'NARRACION ESCENA 2': 'En el área de Fishers Lagoon, hay una silla de ruedas vieja abandonada en el muelle de madera.',
                'VISUAL ESCENA 3 (Prompt Imagen Detallado)': 'A vintage TV screen glowing with static, showing a blurry silhouette of a cryptid monster in the woods.',
                'NARRACION ESCENA 3': 'Muchos jugadores juraban haber visto figuras extrañas o escuchar ruidos bizarros alrededor de la laguna a las 3 de la mañana.',
                'VISUAL ESCENA 4 (Prompt Imagen Detallado)': 'A high detailed map of San Andreas with a glowing red X mark over Fisher Lagoon, detective investigation board.',
                'NARRACION ESCENA 4': 'Resulta que esta silla es un guiño a una película clásica de terror, y Rockstar nunca lo confirmó oficialmente hasta una década después.',
                'VISUAL ESCENA 5 (Prompt Imagen Detallado)': 'A cinematic close up of a gamer pressing a glowing X button on a controller, dark neon lighting.',
                'NARRACION ESCENA 5 (CTA)': 'Comenta si tú alguna vez fuiste a investigar este lugar de noche, ¡y síguenos para más secretos de videojuegos!'
            }
        };

        const result = await pool.query(`
            INSERT INTO studio_tasks 
            (title, prompt, assigned_to, status, priority, content_type, publish_targets, media_payload, ig_publish_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id;
        `, [
            'Misterios de San Andreas (Prueba Videojuegos)',
            'Video corto sobre el misterio de Fisher Lagoon en GTA San Andreas.',
            'auto',
            'pending_cm_approval',
            'high',
            'short',
            JSON.stringify(['facebook']),
            JSON.stringify(payload)
        ]);

        console.log('Tarea real de videojuegos creada con éxito con ID:', result.rows[0].id);
        console.log('MediaWorker ya debería estar capturándola para renderizar...');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
