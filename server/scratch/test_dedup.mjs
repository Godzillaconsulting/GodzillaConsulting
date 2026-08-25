import pool from '../config/db.js';

async function testDedup() {
    console.log('🔍 Extrayendo historial de titulares de los últimos 14 días...');
    const pastRes = await pool.query(`
        SELECT id, created_at, base_json FROM newsletters 
        WHERE created_at >= NOW() - INTERVAL '14 days'
        ORDER BY id DESC
    `);
    
    const usedHeadings = new Set();
    const usedWords = new Set();

    pastRes.rows.forEach(r => {
        try {
            const data = typeof r.base_json === 'string' ? JSON.parse(r.base_json) : r.base_json;
            (data.pdfSections || []).forEach(s => {
                if (s.heading) {
                    const h = s.heading.toLowerCase().trim();
                    usedHeadings.add(h);
                    h.split(/\s+/).forEach(w => {
                        if (w.length > 3) usedWords.add(w);
                    });
                }
            });
        } catch(e) {}
    });

    console.log(`📊 Titulares usados recientemente: ${usedHeadings.size}`);
    console.log('--- MUESTRA DE TITULARES BLOQUEADOS PARA FUTUROS BOLETINES ---');
    Array.from(usedHeadings).slice(0, 10).forEach((h, i) => console.log(`  ${i+1}. "${h}"`));
    
    process.exit(0);
}
testDedup();
