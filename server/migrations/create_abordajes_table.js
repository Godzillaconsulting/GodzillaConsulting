import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function createAbordajesTable() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('🔌 Conectado a PostgreSQL...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS abordajes (
                id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa                 VARCHAR(255) NOT NULL,
                web                     VARCHAR(255),
                servicios               TEXT,
                metas                   TEXT,
                diferenciadores         TEXT,
                db_option               VARCHAR(50),

                -- Redes: solo guardamos el método elegido, SIN credenciales en texto plano
                redes_meta_variant      VARCHAR(50),
                redes_google_variant    VARCHAR(50),
                redes_tiktok_variant    VARCHAR(50),

                -- Access status por red (done / help / ninguna)
                meta_access_status      VARCHAR(20),
                google_access_status    VARCHAR(20),
                tiktok_access_status    VARCHAR(20),

                -- Credenciales cifradas AES-256-GCM (iv.tag.ciphertext en base64)
                -- NUNCA se almacenan en texto plano. Solo el equipo interno puede descifrar.
                credenciales_cifradas   TEXT,

                -- Cita agendada (Paso 4)
                cita_fecha              DATE,
                cita_hora               VARCHAR(10),
                google_calendar_id      VARCHAR(255),
                personal_calendar_link  TEXT,

                -- Estado del proceso
                status                  VARCHAR(50) DEFAULT 'Nuevo',
                ip_address              VARCHAR(100),
                created_at              TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Tabla "abordajes" creada o ya existía.');

        // Permisos al rol del backend
        try {
            await client.query('GRANT SELECT, INSERT, UPDATE ON abordajes TO godzilla_backend;');
            console.log('✅ Permisos otorgados a godzilla_backend.');
        } catch (e) {
            console.warn('⚠️ No se pudo otorgar permisos (puede ser que el rol no exista):', e.message);
        }

        console.log('🎉 Migración completada exitosamente.');
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
        process.exit(1);
    } finally {
        await client.end();
        process.exit(0);
    }
}

createAbordajesTable();
