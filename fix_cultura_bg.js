import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: './server/.env'});
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

async function fix() {
    const res = await pool.query("SELECT published_data FROM site_nodes WHERE id='cultura'");
    const d = res.rows[0].published_data;
    delete d.bgVideoUrl;
    await pool.query("UPDATE site_nodes SET published_data=$1, draft_data=$1 WHERE id='cultura'", [d]);
    console.log("Database updated successfully");
    process.exit(0);
}

fix();
