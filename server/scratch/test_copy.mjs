import pool from '../config/db.js';
import { executeAiWaterfall } from '../utils/aiWaterfall.js';

async function testTextGen() {
    const res = await pool.query('SELECT base_json FROM newsletters ORDER BY id DESC LIMIT 1');
    const data = JSON.parse(res.rows[0].base_json);
    const sections = data.pdfSections.slice(0, 4);

    for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        console.log(`\n========================================`);
        console.log(`📰 NOTICIA ${i+1}: ${sec.heading}`);
        console.log(`========================================`);
        
        const textPrompt = `Eres un analista experto en redes sociales corporativas. Tenemos esta noticia de IA:
Título: ${sec.heading}
Contenido: ${(sec.content || '').substring(0, 800)}

Devuelve un JSON estrictamente válido con 2 campos:
1. "socialText": Texto IMPACTANTE y DENSO de EXACTAMENTE 25-35 palabras. Estructura: [CONTEXTO FUERTE] + [DATO DURO/MÉTRICA REAL] + [CONSECUENCIA]. Sin frases genéricas. Encierra 1-2 palabras clave entre <color> y </color>.
2. "imagePrompt": Prompt en inglés para imagen fotográfica hiperrealista estilo TIME magazine. Escena concreta y real relacionada directamente al tema (${sec.heading}). Sin texto, sin letras, sin ciencia ficción. Fotografía editorial limpia, bien iluminada.`;

        try {
            const waterfallRes = await executeAiWaterfall([
                { role: 'system', content: 'Eres un experto en marketing de tecnología. Responde SOLO con JSON puro válido, sin markdown.' },
                { role: 'user', content: textPrompt }
            ], { mode: 'noTools', jsonMode: true, temperature: 0.5, maxTokens: 512 });

            let raw = waterfallRes.content || '';
            const s = raw.indexOf('{'); const e = raw.lastIndexOf('}');
            if (s !== -1 && e !== -1) raw = raw.substring(s, e+1);
            const parsed = JSON.parse(raw);
            console.log('📝 TEXTO SOCIAL GENERADO PARA IMAGEN:');
            console.log(parsed.socialText);
        } catch(e) {
            console.error('❌ Error:', e.message);
        }
    }
    process.exit(0);
}
testTextGen();
