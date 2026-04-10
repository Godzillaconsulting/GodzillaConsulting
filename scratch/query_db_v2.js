import pg from 'pg';

const pool = new pg.Pool({
    connectionString: "postgresql://postgres:godzilla2026@localhost:5432/godzilla",
});

async function run() {
    try {
        const res = await pool.query("SELECT id, draft_data, published_data FROM site_nodes WHERE id LIKE 'paquete-%'");
        res.rows.forEach(r => {
            console.log("=== Node:", r.id, "===");
            console.log("DRAFT INFO:", JSON.stringify(r.draft_data));
        });
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
