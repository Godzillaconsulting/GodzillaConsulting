import db from './server/config/db.js';
db.query("UPDATE studio_tasks SET status = 'pending_local_test' WHERE status = 'failed'").then(r => {
    console.log('Updated tasks to pending_local_test:', r.rowCount);
    process.exit(0);
}).catch(console.error);
