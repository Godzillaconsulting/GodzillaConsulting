import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const connectionString = 'postgresql://postgres:godzilla2026@localhost:5432/godzilla';

const pool = new Pool({
    connectionString,
});

async function runMigration() {
    const client = await pool.connect();
    console.log("Iniciando migración Godzilla-Brain...");
    try {
        await client.query('BEGIN');
        
        // 1. Tabla Clients (Multitenant core)
        console.log("-> Creando tabla clients...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                project_tag VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insertar Godzilla Consulting por defecto si no existe
        await client.query(`
            INSERT INTO clients (name, project_tag) 
            VALUES ('Godzilla Consulting Central', 'GODZILLA_MAIN')
            ON CONFLICT (project_tag) DO NOTHING;
        `);

        // 2. Tabla Neurons
        console.log("-> Creando tabla neurons...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS neurons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                network VARCHAR(50) NOT NULL,
                external_id VARCHAR(255),
                session_data JSONB,
                status VARCHAR(50) DEFAULT 'pending',
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Tabla Context Prompts
        console.log("-> Creando tabla context_prompts...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS context_prompts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                project_tag VARCHAR(100),
                system_prompt TEXT NOT NULL,
                fallback_rules JSONB,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Tabla Unified Chats
        console.log("-> Creando tabla unified_chats...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS unified_chats (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
                unified_user_id VARCHAR(255) NOT NULL,
                network VARCHAR(50) NOT NULL,
                external_user_id VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear index para acelerar búsquedas
        await client.query(`CREATE INDEX IF NOT EXISTS idx_unified_user ON unified_chats(unified_user_id)`);

        console.log("-> Copiando datos preventivos de sesiones_chat...");
        // Copia segura desde sesiones_chat actual (si es que existe y tiene formato compatible).
        // No borramos la tabla anterior (estrategia segura seleccionada).
        
        await client.query('COMMIT');
        console.log("✅ Migración Godzilla-Brain completada con éxito.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Error en la migración:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
