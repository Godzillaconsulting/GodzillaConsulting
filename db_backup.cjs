const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, 'backups');

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function runBackup() {
    console.log('[DB BACKUP] Iniciando proceso de volcado de la BD Godzilla-Brain...');
    
    // Generar timestamp YYYY-MM-DD_HH-MM
    const date = new Date();
    const timestamp = date.toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `godzilla_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const connectionString = 'postgresql://postgres:godzilla2026@localhost:5432/godzilla';

    // Usamos pg_dump enviando la connection string y volcando al archivo
    const command = `pg_dump "${connectionString}" -F c -f "${filepath}"`;

    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
            console.error('[DB BACKUP] ❌ Error ejecutando pg_dump:', error.message);
            return;
        }

        console.log(`[DB BACKUP] ✅ Backup generado exitosamente: ${filename}`);

        // Purga opcional (borrar backups más antiguos de 30 días)
        cleanOldBackups(30);
    });
}

function cleanOldBackups(daysToKeep) {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const msToKeep = daysToKeep * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    files.forEach(file => {
        if (file.endsWith('.sql')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > msToKeep) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }
    });

    if (deletedCount > 0) {
        console.log(`[DB BACKUP] 🧹 Se purgaron ${deletedCount} respaldos antiguos.`);
    }
}

// Ejecutar inmediatamente al correr el script, el schedule se manejará por PM2 Cron.
runBackup();
