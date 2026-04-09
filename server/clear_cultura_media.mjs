import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Carga el .env del servidor
const envConfig = dotenv.parse(readFileSync('C:\\Users\\GODZILLA.IA\\GodzillaConsulting\\server\\.env'));
Object.assign(process.env, envConfig);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 1,
});

async function clearCulturaMedia() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectado a PostgreSQL Local...\n');

    // 1. Leer el estado actual del nodo
    const current = await client.query(`SELECT id, draft_data, published_data FROM site_nodes WHERE id = 'cultura'`);
    if (current.rows.length === 0) {
      console.log('❌ No se encontró el nodo "cultura" en la BD.');
      return;
    }

    const node = current.rows[0];
    const draft = node.draft_data || {};
    const published = node.published_data || {};

    console.log('📋 Estado ACTUAL del nodo cultura:');
    console.log('   draft_data.imageUrl:', draft.imageUrl);
    console.log('   draft_data.mediaGallery:', JSON.stringify(draft.mediaGallery));
    console.log('   published_data.imageUrl:', published.imageUrl);
    console.log('   published_data.mediaGallery:', JSON.stringify(published.mediaGallery));
    console.log('');

    // 2. Limpiar: borrar imageUrl y mediaGallery (dejarlos vacíos/null)
    const cleanedDraft = { ...draft };
    delete cleanedDraft.imageUrl;
    cleanedDraft.mediaGallery = [];

    const cleanedPublished = { ...published };
    delete cleanedPublished.imageUrl;
    cleanedPublished.mediaGallery = [];

    // 3. Guardar en BD
    await client.query(`
      UPDATE site_nodes
      SET draft_data = $1, published_data = $2, updated_at = NOW()
      WHERE id = 'cultura'
    `, [cleanedDraft, cleanedPublished]);

    console.log('✅ Nodo "cultura" limpiado exitosamente.');
    console.log('   ✓ imageUrl: eliminado');
    console.log('   ✓ mediaGallery: vaciado []');
    console.log('');
    console.log('🎯 Ahora abre el Admin Studio -> Cultura -> Media');
    console.log('   y usa el botón "+ Añadir nuevo medio" para subir tus fotos.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

clearCulturaMedia();
