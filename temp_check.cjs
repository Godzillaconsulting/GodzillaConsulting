const { pool } = require('./server/config/db.js');
pool.query("SELECT id, status, media_payload FROM studio_tasks ORDER BY id DESC LIMIT 5").then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
});
