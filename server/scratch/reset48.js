import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({user:'postgres',host:'localhost',database:'godzilla',password:'godzilla2026',port:5432});
pool.query("UPDATE studio_tasks SET status = 'pending_render' WHERE id = 48").then(r => {
    console.log('Reset OK, rows affected:', r.rowCount);
    pool.end();
});
