import { pipeline } from '@huggingface/transformers';
import * as lancedb from '@lancedb/lancedb';
import path from 'path';
import fs from 'fs';

const CORE_NAME = 'AI Core (LanceDB Engine)';
console.log(`[${CORE_NAME}] 🧠 Iniciando cerebro central vectorial...`);

const DB_PATH = path.resolve('server/core_engine/brain_data');
let embedder = null;
let db = null;
let memoryTable = null;

// Crear directorio si no existe
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

/**
 * Inicializa el modelo de embeddings local (all-MiniLM-L6-v2)
 */
async function initEmbedder() {
    if (!embedder) {
        console.log(`[${CORE_NAME}] ⏳ Cargando red neuronal de Embeddings...`);
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
        console.log(`[${CORE_NAME}] ✅ Modelo neuronal cargado en RAM (Costo: $0.00).`);
    }
    return embedder;
}

/**
 * Conecta a LanceDB local y prepara la colección de memorias.
 */
async function initLanceDB() {
    if (!db) {
        db = await lancedb.connect(DB_PATH);
        const tableNames = await db.tableNames();
        
        if (tableNames.includes('bot_memories')) {
            memoryTable = await db.openTable('bot_memories');
            console.log(`[${CORE_NAME}] 💾 Base de datos LanceDB conectada.`);
        } else {
            console.log(`[${CORE_NAME}] 🛠️ Creando nueva tabla de recuerdos en LanceDB...`);
            // Se inicializa con un registro vacío (dummy) para establecer el esquema (Vector de 384 dims)
            memoryTable = await db.createTable('bot_memories', [{
                vector: Array(384).fill(0),
                bot_name: 'system',
                context_type: 'init',
                content: 'system_init'
            }]);
        }
    }
    return memoryTable;
}

export async function generateEmbedding(text) {
    const model = await initEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

/**
 * Inyecta un nuevo conocimiento en LanceDB.
 */
export async function addMemory(botName, contextType, content) {
    try {
        console.log(`[${CORE_NAME}] 📥 Memorizando conocimiento para [${botName}]...`);
        const table = await initLanceDB();
        const vector = await generateEmbedding(content);
        
        await table.add([{
            vector: vector,
            bot_name: botName,
            context_type: contextType,
            content: content
        }]);
        
        console.log(`[${CORE_NAME}] ✅ Recuerdo guardado en disco duro.`);
        return true;
    } catch (e) {
        console.error(`[${CORE_NAME}] ❌ Error guardando memoria en LanceDB:`, e.message);
        return false;
    }
}

/**
 * Busca los recuerdos más relevantes usando indexación ANN en disco.
 */
export async function searchMemories(botName, query, limit = 3) {
    try {
        const table = await initLanceDB();
        const queryVector = await generateEmbedding(query);

        const results = await table.search(queryVector)
            .limit(limit)
            // LanceDB permite filtrar por campos con sintaxis SQL interna
            .where(`bot_name = '${botName}' AND context_type != 'init'`)
            .toArray();
            
        // Si results es un array real
        if (Array.isArray(results)) {
            return results.map(r => r.content);
        }
        
        return [];
    } catch (e) {
        console.error(`[${CORE_NAME}] ❌ Error buscando en LanceDB:`, e.message);
        return [];
    }
}

// ----------------------------------------------------------------------
// PM2: Inicialización
// ----------------------------------------------------------------------
async function bootUp() {
    await initEmbedder();
    await initLanceDB();
    console.log(`[${CORE_NAME}] 🟢 Cerebro Central Activo y Listo 24/7.`);
}

bootUp().catch(err => console.error("Fallo crítico en bootUp:", err));

setInterval(() => { /* heartbeat */ }, 60000);
process.on('SIGINT',  () => { console.log(`🛑 [${CORE_NAME}] Apagando...`); process.exit(0); });
process.on('SIGTERM', () => { console.log(`🛑 [${CORE_NAME}] Apagando...`); process.exit(0); });
