const { Pool } = require('pg');
const bcrypt = require('./server/node_modules/bcryptjs');
const p = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function run() {
    const r = await p.query('SELECT username, password_hash FROM admins ORDER BY id');
    console.log('Admins en DB:');
    r.rows.forEach(u => {
        console.log(`  - ${u.username}: hash = ${u.password_hash?.substring(0, 20)}...`);
    });

    // Probar variantes de contraseña comunes para godzilla_admin
    const passwords = ['Godzilla2026!', 'godzilla2026', 'Godzilla2026', 'admin123', 'Godzilla123!', 'godzilla2026!'];
    const admin = r.rows.find(x => x.username.toLowerCase() === 'godzilla_admin');
    if (admin) {
        for (const pw of passwords) {
            const match = await bcrypt.compare(pw, admin.password_hash);
            if (match) {
                console.log(`\n✅ Contraseña encontrada para godzilla_admin: "${pw}"`);
                await p.end();
                return;
            }
        }
        console.log('\n❌ Ninguna de las contraseñas comunes coincide.');
    }
    await p.end();
}

run().catch(e => { console.error(e.message); p.end(); });
