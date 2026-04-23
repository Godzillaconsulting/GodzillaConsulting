import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('Iniciando migración para automation_flow...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS automation_flow (
                id SERIAL PRIMARY KEY,
                nodes JSONB NOT NULL DEFAULT '[]',
                edges JSONB NOT NULL DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla automation_flow creada con éxito.');
        
        // Insertar el estado inicial (mockup) si está vacía
        const result = await pool.query('SELECT COUNT(*) FROM automation_flow');
        if (parseInt(result.rows[0].count) === 0) {
            const initialNodes = [
                { id: '1', type: 'trigger', title: 'Estudio IA', subtitle: 'Generador UGC', icon: 'Bot', x: 50, y: 220, color: '#f59e0b', pm2_process: '' },
                { id: '2', type: 'action', title: 'Editor Pro', subtitle: 'CapCut', icon: 'Activity', x: 300, y: 220, color: '#3b82f6', pm2_process: '' },
                { id: '3', type: 'action', title: 'Planificador', subtitle: 'Agendar Tarea', icon: 'Calendar', x: 550, y: 100, color: '#a855f7', pm2_process: '' },
                { id: '4', type: 'agent', title: 'Publicador Social', subtitle: 'TikTok/IG', icon: 'Webhook', x: 850, y: 200, color: '#10b981', pulse: false, pm2_process: 'zilla-tiktok' }
            ];
            const initialEdges = [
                { id: 'e1-2', source: '1', target: '2', color: '#f59e0b' },
                { id: 'e2-3', source: '2', target: '3', color: '#3b82f6' },
                { id: 'e2-4', source: '2', target: '4', color: '#10b981' },
                { id: 'e3-4', source: '3', target: '4', color: '#a855f7' }
            ];
            
            await pool.query(
                `INSERT INTO automation_flow (id, nodes, edges, updated_at) VALUES (1, $1, $2, NOW())`,
                [JSON.stringify(initialNodes), JSON.stringify(initialEdges)]
            );
            console.log('Datos iniciales del flow insertados.');
        }

    } catch (err) {
        console.error('Error durante la migración:', err);
    } finally {
        await pool.end();
        console.log('Migración finalizada.');
        process.exit(0);
    }
}

runMigration();
