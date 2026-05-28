import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
import pool from './server/config/db.js';

pool.query("UPDATE studio_tasks SET status = 'pending_render' WHERE id = 29 RETURNING id, status").then(res => {
    console.log("Updated task 29 status:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
}).catch(console.error);
