const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("Eliminando los usuarios 'admin' y 'admin_prueba'...");
    
    const result = await pool.query("DELETE FROM admins WHERE username IN ('admin', 'admin_prueba') RETURNING username");
    
    console.log("Borrados exitosamente:");
    console.table(result.rows);

    const remaining = await pool.query("SELECT username, role, is_superadmin FROM admins");
    console.log("\nUsuarios Activos Restantes en el Servidor:");
    console.table(remaining.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
