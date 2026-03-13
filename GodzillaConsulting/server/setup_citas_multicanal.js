import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS citas_whatsapp (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    fecha_cita DATE NOT NULL,
    hora TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmada',
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citas_facebook_ig (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    fbid VARCHAR(255) NOT NULL,
    plataforma VARCHAR(50) NOT NULL,
    fecha_cita DATE NOT NULL,
    hora TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmada',
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(sql)
    .then(() => {
        console.log('✅ Tablas citas_whatsapp y citas_facebook_ig creadas exitosamente.');
        pool.end();
    })
    .catch(e => {
        console.error('❌ Error creando tablas multicanal:', e.message);
        pool.end();
    });
