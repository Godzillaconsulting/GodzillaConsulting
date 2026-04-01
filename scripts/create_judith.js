import bcrypt from 'bcrypt';
import pool from '../server/config/db.js';

async function createJudithProfile() {
    console.log('🤖 Inicializando Perfil Restringido de Community Manager (Judith)...');
    try {
        // Asegurarnos de que el esquema tiene columna role para UI locking
        await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'admin';`);
        console.log(' - ✅ Columna de Roles añadida al Blindaje (si no existía).');

        const username = 'Judith';
        const passwordPlain = 'Judith2026*'; // Contraseña temporal
        
        // Revisar si ya existe
        const existsRes = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
        if (existsRes.rows.length > 0) {
            console.log(`❌ El usuario ${username} ya existía en el bunker.`);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(passwordPlain, salt);

        // Crear a Judith con poder CM 
        await pool.query(
            "INSERT INTO admins (username, password_hash, is_superadmin, role) VALUES ($1, $2, $3, $4)",
            [username, hash, false, 'cm']
        );

        console.log(`\n✅ ¡CREDENCIALES DE CM CREADAS!`);
        console.log(`👤 Usuario: ${username}`);
        console.log(`🔑 Contraseña Temporal: ${passwordPlain}`);
        console.log(`🛡️ Privilegios: Modo 'Community Manager' (Solo lectura de Web, Escritura Total en Social Calendar)`);

        process.exit(0);
    } catch (e) {
        console.error('❌ Error Crítico SQL:', e);
        process.exit(1);
    }
}

createJudithProfile();
