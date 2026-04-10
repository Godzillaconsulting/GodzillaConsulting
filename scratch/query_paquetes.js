import pg from 'pg';

const pool = new pg.Pool({
    connectionString: "postgresql://postgres:godzilla2026@localhost:5432/godzilla",
});

async function run() {
    try {
        const res = await pool.query("SELECT published_data FROM site_nodes WHERE id = 'paquetes'");
        console.log(JSON.stringify(res.rows[0]?.published_data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
