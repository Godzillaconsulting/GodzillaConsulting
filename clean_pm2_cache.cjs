const { exec } = require('child_process');

console.log("Iniciando purga de procesos huerfanos y caches de PM2...");

exec('pm2 flush && pm2 reload all', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error al purgar PM2: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`PM2 error details: ${stderr}`);
    }
    console.log(`✅ PM2 Limpiado y recargado con exito:\n${stdout}`);
});
