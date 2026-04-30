import { generarGuionDelDia } from './server/auto_content_bot.js';
import pool from './server/config/db.js';

(async () => {
    try {
        const guion = await generarGuionDelDia('¿Por qué depender de referidos está matando el crecimiento de tu empresa Tech?');
        const mediaPayload = {
            source: 'ai_planner',
            niche: 'Startups',
            month: 'Abril',
            year: 2026,
            scenes: {
                'Tema': 'Crecimiento sin Referidos',
                'Copy': guion.caption,
                'Prompt Visual': guion.visual_prompt
            }
        };
        
        await pool.query(
            `INSERT INTO studio_tasks (title, prompt, assigned_to, tags, priority, status, content_type, media_payload) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
            [
                'IA 100% Real: Crecimiento Tech', 
                guion.caption + '\\n\\nPrompt: ' + guion.visual_prompt, 
                'auto', 
                JSON.stringify(['AI-Generated', 'Viral']), 
                'High', 
                'pending', 
                'Video Corto', 
                JSON.stringify(mediaPayload)
            ]
        );
        console.log('✅ REAL AI TASK INJECTED SUCCESSFULLY!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
