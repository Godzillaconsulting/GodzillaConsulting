import dotenv from 'dotenv';
dotenv.config({path: './server/.env'});
import pool from '../server/config/db.js';

pool.query("UPDATE studio_tasks SET status = 'pending_render' WHERE id = 19 RETURNING id, status")
  .then(r => { 
      console.log('Tasks reset:', r.rows); 
      process.exit(0); 
  })
  .catch(e => {
      console.error(e);
      process.exit(1);
  });
