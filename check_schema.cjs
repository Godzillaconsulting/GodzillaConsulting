const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:godzilla2026@localhost:5432/godzilla' });

async function check() {
    const admins = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='admins' ORDER BY ordinal_position`);
    console.log('admins cols:', admins.rows.map(x => x.column_name).join(', '));

    const attempts = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='login_attempts' ORDER BY ordinal_position`);
    console.log('login_attempts cols:', attempts.rows.map(x => x.column_name).join(', '));

    await p.end();
}
check().catch(e => { console.error(e.message); p.end(); });
