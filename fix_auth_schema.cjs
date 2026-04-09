const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function fixSchema() {
    console.log('🔧 Aplicando migraciones de esquema...\n');

    const migrations = [
        // admins: agregar columna is_locked que usa auth.js
        `ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE`,
        
        // login_attempts: agregar columnas que usa auth.js
        `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT ''`,
        `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
        `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT FALSE`,
    ];

    for (const sql of migrations) {
        try {
            await p.query(sql);
            console.log(`✅ ${sql.substring(0, 70)}...`);
        } catch (e) {
            console.error(`❌ ${sql.substring(0, 70)}: ${e.message}`);
        }
    }

    // Verificar estado final
    const admins = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='admins' ORDER BY ordinal_position`);
    console.log('\nadmins cols:', admins.rows.map(x => x.column_name).join(', '));

    const att = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='login_attempts' ORDER BY ordinal_position`);
    console.log('login_attempts cols:', att.rows.map(x => x.column_name).join(', '));

    await p.end();
    console.log('\n✅ Migraciones completadas.');
}

fixSchema().catch(e => { console.error(e.message); p.end(); });
