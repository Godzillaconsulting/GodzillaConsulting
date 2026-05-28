import pool from '../server/config/db.js';
async function main() {
    try {
        const resTasks = await pool.query('SELECT id, title, status, content_type FROM studio_tasks ORDER BY id DESC');
        console.log('Total tasks in studio_tasks:', resTasks.rowCount);
        console.log(resTasks.rows);

        // Check if media_approvals table exists and has rows
        try {
            const resApprovals = await pool.query('SELECT * FROM media_approvals');
            console.log('Total media_approvals:', resApprovals.rowCount);
            console.log(resApprovals.rows);
        } catch (e) {
            console.log('media_approvals check failed or table does not exist:', e.message);
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
main();
