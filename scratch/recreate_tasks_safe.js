import pool from '../server/config/db.js';

async function main() {
    try {
        console.log('🗑️ Deleting all existing video tasks from studio_tasks...');
        const deleteRes = await pool.query("DELETE FROM studio_tasks WHERE content_type = 'video'");
        console.log(`✅ Deleted ${deleteRes.rowCount} video tasks.`);

        const payload = {
            voice: 'elevenlabs:y2ijeTfmnXjzheHO6zeN',
            sceneCount: 5,
            scenes: {
                'NARRACION ESCENA 1': '¡La Máquina hace historia! El Cruz Azul es el nuevo campeón del Clausura 2026 de la Liga MX. El equipo celeste consiguió su décima estrella en una final dramática frente a los Pumas de la UNAM, consolidando una temporada de ensueño.',
                'VISUAL ESCENA 1 (Prompt Imagen Detallado)': 'A dynamic photo of professional soccer players wearing royal blue jerseys with a red and white crest on the chest, celebrating a championship victory on the green grass pitch of a soccer stadium at night, stadium stands filled with fans under floodlights, blue and white confetti falling in the air, professional sports photography, realistic, high-fidelity photo, no watermark, no text',
                
                'NARRACION ESCENA 2': 'El partido de ida en el Estadio Ciudad de los Deportes terminó con un cerrado empate a cero goles, dejando todo por decidirse en la vuelta. La tensión se sentía en el aire mientras ambas aficiones sabían que solo noventa minutos los separaban de la gloria.',
                'VISUAL ESCENA 2 (Prompt Imagen Detallado)': 'Wide angle view of Estadio Ciudad de los Deportes soccer stadium packed with fans under bright night floodlights, showing steep concrete stands painted in deep blue and red, green grass pitch, dramatic atmospheric smoke, professional sports stadium photography, realistic, no text, no watermark',
                
                'NARRACION ESCENA 3': 'En el partido decisivo en Ciudad Universitaria, la emoción explotó. Con garra y pasión, el Cruz Azul logró imponerse con un marcador de dos goles a uno. Cada jugada disputada al límite dejó el alma de los jugadores en la cancha.',
                'VISUAL ESCENA 3 (Prompt Imagen Detallado)': 'Action shot of an athletic professional soccer player with light-brown short hair, wearing a royal blue jersey with a red and white circular crest on the chest, white shorts, kicking a soccer ball dynamically on the grass pitch of Estadio Olímpico Universitario at night, dramatic dynamic stadium floodlights, professional sports action photo, realistic, high-fidelity sports photo, no watermark, no text',
                
                'NARRACION ESCENA 4': 'Con un marcador global definitivo de dos a uno, Cruz Azul alza la Décima. Pumas luchó hasta el último segundo, pero la Máquina de Joel Huiqui demostró solidez y concentración táctica para coronar a un gran campeón en el último suspiro.',
                'VISUAL ESCENA 4 (Prompt Imagen Detallado)': 'A professional soccer coach of Mexican descent, athletic build, short black hair, tan skin, wearing a white button-up shirt and dark navy blue trousers, celebrating passionately on the pitch of Estadio Olímpico Universitario at night, shouting with joy with arms raised, dramatic stadium lighting, professional sports photography, realistic, high-fidelity photo, no watermark',
                
                'NARRACION ESCENA 5 (CTA)': 'Este décimo título del Cruz Azul quedará grabado para siempre en la afición. ¿Qué te pareció esta gran final? Déjanos tu opinión en los comentarios, dale like al video y suscríbete para estar siempre al día con lo mejor del fútbol mexicano.',
                'VISUAL ESCENA 5 (Prompt Imagen Detallado)': 'Cruz Azul soccer fans celebrating in the streets of Mexico City at night, wearing classic royal blue team jerseys, waving blue and white flags, blue and white confetti, fireworks in the night sky, highly realistic sports fan celebration, cinematic photography, no watermark, no text'
            }
        };

        console.log('✍️ Inserting fresh video task for Liga MX Final 2026...');
        const insertRes = await pool.query(
            `INSERT INTO studio_tasks (title, prompt, status, content_type, assigned_to, tags, priority, media_payload, created_by) 
             VALUES ($1, $2, 'pending_render_docker', 'video', 'auto', $3::jsonb, 'alta', $4, 'manual') 
             RETURNING id, title, status`,
            [
                '🏆 Cruz Azul Campeón Clausura 2026',
                'Final Liga MX Clausura 2026 Cruz Azul vs Pumas',
                JSON.stringify(['LigaMX', 'CruzAzul', 'Fútbol', 'Campeón']),
                JSON.stringify(payload)
            ]
        );

        console.log('✅ Fresh safe video task created successfully:', insertRes.rows[0]);
    } catch (err) {
        console.error('❌ Error during task recreation:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
