import pool from '../config/db.js';

async function updateTranslations() {
    try {
        const result = await pool.query("SELECT * FROM site_nodes WHERE id = 'paquetes'");
        if (result.rows.length > 0) {
            let data = result.rows[0].published_data;
            if (data.translations && data.translations.en) {
                console.log("English translations exist, deleting them to fallback to en.json!");
                delete data.translations.en;
                await pool.query("UPDATE site_nodes SET published_data = $1, draft_data = $1 WHERE id = 'paquetes'", [data]);
                console.log("Deleted en translations successfully.");
            } else {
                console.log("No en translations found in DB for paquetes.");
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

updateTranslations();
