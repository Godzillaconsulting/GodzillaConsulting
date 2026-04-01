import 'dotenv/config'; // Asegura que lee .env
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

    let reportLines = [];
    reportLines.push("==================================================");
    reportLines.push(`🦖 REPORTE DE EXTRACCIÓN Y RESPALDO: GODZILLA CONSULTING`);
    reportLines.push(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
    reportLines.push("==================================================\n");
    reportLines.push("✅ Tablas Respaldadas Exitosamente:");

    let errorCount = 0;

    for (const table of tables) {
        process.stdout.write(` - Descargando tabla ${table}... `);
        try {
            const res = await pool.query(`SELECT * FROM ${table}`);
            backupData[table] = res.rows;
            const msg = `[OK] (${res.rows.length} registros rescatados)`;
            console.log(msg);
            reportLines.push(`  - ${table.padEnd(15)} | ${res.rows.length} registros rescatados`);
        } catch (e) {
            console.log(`[ERROR o Vacía]: ${e.message}`);
            reportLines.push(`  ❌ ${table.padEnd(14)} | Error: ${e.message}`);
            errorCount++;
        }
    }

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const fileName = `godzilla_db_backup_${dateStr}.json`;
    const fullPath = path.join(bkDir, fileName);
    
    // Exportar todo como JSON estructurado al disco duro
    fs.writeFileSync(fullPath, JSON.stringify(backupData, null, 2));
    
    const sizeMb = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Respaldo Exitoso: guardado localmente en ./backups/${fileName}`);
    console.log(`📂 Tamaño del Archivo .JSON: ${sizeMb} MB`);

    reportLines.push(`\n📂 Archivo Central: ${fileName}`);
    reportLines.push(`⚖️ Peso Total: ${sizeMb} MB`);
    reportLines.push(`\n🗑️ PURGA DE RESPALDOS ANTIGUOS (>21 días):`);

    // --- LÓGICA DE PURGA (>21 DÍAS) ---
    const files = fs.readdirSync(bkDir);
    const now = Date.now();
    const twentyOneDaysMs = 21 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(bkDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > twentyOneDaysMs) {
            fs.unlinkSync(filePath);
            reportLines.push(`  - Eliminado por antigüedad: ${file}`);
            deletedCount++;
        }
    }

    if (deletedCount === 0) {
        reportLines.push("  - Ningún archivo sobrepasó el límite de caducidad hoy.");
    }

    reportLines.push("\n==================================================");
    reportLines.push("Fin del informe. Este archivo se sobreescribe cada respaldo.");

    // --- EXPORTAR REPORTE AL ESCRITORIO ---
    try {
        // En Windows, process.env.USERPROFILE apunta casi siempre a C:\Users\NombreUsuario
        const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\GODZILLA.IA', 'Desktop');
        const reportPath = path.join(desktopPath, 'REPORTE_RESPALDO_GODZILLA.txt');
        
        fs.writeFileSync(reportPath, reportLines.join('\n'));
        console.log(`📄 Reporte gerencial generado en el Escritorio: ${reportPath}`);
    } catch (e) {
        console.log(`⚠️ No se pudo generar el reporte en el escritorio: ${e.message}`);
    }
    
    process.exit(0);
}

backup();
