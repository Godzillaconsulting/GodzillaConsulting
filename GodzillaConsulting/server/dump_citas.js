import pool from './config/db.js';
import fs from 'fs';

async function verify() {
    try {
        const result = await pool.query("SELECT * FROM citas ORDER BY created_at DESC LIMIT 5");
        fs.writeFileSync("citas_clean.json", JSON.stringify(result.rows, null, 2), "utf8");
        console.log("Saved to citas_clean.json");
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
verify();
