import pool from '../server/config/db.js';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'E:/Godzilla_Studio_Cache/outputs';

async function main() {
    try {
        // 1. Clean up task 9 temp files
        console.log('Cleaning up Task 9 files...');
        if (fs.existsSync(OUTPUT_DIR)) {
            const files = fs.readdirSync(OUTPUT_DIR);
            for (const file of files) {
                if (file.startsWith('task_9_')) {
                    const filePath = path.join(OUTPUT_DIR, file);
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted: ${file}`);
                    } catch (err) {
                        console.error(`Error deleting file ${file}:`, err.message);
                    }
                }
            }
        }

        // 2. Reset Task 9 status
        const res = await pool.query(
            `UPDATE studio_tasks 
             SET status = 'pending_render', updated_at = NOW() 
             WHERE id = 9 
             RETURNING *`
        );
        
        if (res.rowCount > 0) {
            console.log(`✅ Task 9 status reset to 'pending_render'`);
        } else {
            console.log('❌ Task 9 not found in database.');
        }
    } catch (err) {
        console.error('Error resetting task 9:', err);
    }
    process.exit(0);
}
main();
