import pool from './config/db.js';
import { generateDailySocialMediaAssets } from './services/socialMediaVisuals.js';

async function run() {
    console.log('🔍 Buscando newsletter de hoy en la base de datos...');
    const res = await pool.query(
        `SELECT id, base_json, created_at FROM newsletters 
         WHERE DATE(created_at AT TIME ZONE 'America/Mexico_City') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City') 
         ORDER BY id DESC LIMIT 1`
    );

    if (!res.rows.length) {
        console.log('❌ No hay newsletter de hoy en la DB.');
        process.exit(0);
    }

    const row = res.rows[0];
    console.log(`✅ Newsletter #${row.id} encontrado (${row.created_at})`);

    const data = JSON.parse(row.base_json);
    const sections = data?.pdfSections || [];
    console.log(`📰 Número de secciones: ${sections.length}`);
    sections.forEach((s, i) => console.log(`   ${i+1}. ${s.heading}`));

    if (sections.length === 0) {
        console.log('❌ El boletín guardado no tiene secciones. Abortando.');
        process.exit(1);
    }

    console.log('\n🎨 Generando imágenes para redes sociales y enviando a godzilladiseno...');
    await generateDailySocialMediaAssets(sections);
    console.log('✅ Proceso completado.');
    process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e); process.exit(1); });
