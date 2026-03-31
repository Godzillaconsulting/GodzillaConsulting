import pool from '../server/config/db.js';
import fs from 'fs';
import path from 'path';

async function backup() {
    console.log('📦 [INIT] Iniciando Respaldo Maestro Local de Godzilla Consulting DB...');
    
    // Tablas totales de la Agencia
    const tables = ['admins', 'media_storage', 'nodes', 'lead_magnets', 'users', 'citas', 'page_views', 'pixel_events', 'admin_logs'];
    const backupData = {};

    const bkDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(bkDir)) fs.mkdirSync(bkDir);

    let errorCount = 0;

    for (const table of tables) {
        process.stdout.write(` - Descargando tabla ${table}... `);
        try {
            const res = await pool.query(`SELECT * FROM ${table}`);
            backupData[table] = res.rows;
            console.log(`[OK] (${res.rows.length} registros rescatados)`);
        } catch (e) {
            console.log(`[ERROR o Vacía]: ${e.message}`);
            errorCount++;
        }
    }

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const fileName = `godzilla_db_backup_${dateStr}.json`;
    const fullPath = path.join(bkDir, fileName);
    
    // Exportar todo como JSON estructurado al disco duro
    fs.writeFileSync(fullPath, JSON.stringify(backupData, null, 2));
    
    console.log(`\n✅ Respaldo Exitoso: guardado localmente en ./backups/${fileName}`);
    const sizeMb = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
    console.log(`📂 Tamaño del Archivo .JSON: ${sizeMb} MB`);
    
    process.exit(0);
}

backup();
