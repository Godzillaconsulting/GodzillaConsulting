import pool from '../server/config/db.js';

async function check() {
    try {
        console.log("=== DB Connection Info ===");
        const dbUrl = process.env.DATABASE_URL || "";
        // Obfuscate password in URL
        const obfuscatedUrl = dbUrl.replace(/:([^:@]+)@/, ":******@");
        console.log("DATABASE_URL:", obfuscatedUrl);
        console.log("NODE_ENV:", process.env.NODE_ENV);

        console.log("=== Listing Tables ===");
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log("Tables found:", tablesRes.rows.map(r => r.table_name));

        for (const row of tablesRes.rows) {
            const tableName = row.table_name;
            try {
                const countRes = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
                console.log(`Table: ${tableName} | Count: ${countRes.rows[0].count}`);
            } catch (err) {
                console.log(`Table: ${tableName} | Error: ${err.message}`);
            }
        }
    } catch (err) {
        console.error("Error during check:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
check();
