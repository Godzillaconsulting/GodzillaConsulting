import db from './server/config/db.js';

async function fetchAdmins() {
    try {
        console.log('⏳ Conectando a PostgreSQL...');
        const res = await db.query("SELECT id, name, email, role, phone FROM users WHERE role = 'superadmin' OR role = 'admin'");
        
        console.log('✅ Administradores encontrados:');
        console.table(res.rows);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error extrañando los administradores:', error);
        process.exit(1);
    }
}

fetchAdmins();
