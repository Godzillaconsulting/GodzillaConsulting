import fs from 'fs';
import path from 'path';

// Directorios a ignorar completamente en el árbol
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', '.vercel', 'server/node_modules'];

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const getAllFiles = (dirPath, arrayOfFiles) => {
    let files = [];
    try {
        files = fs.readdirSync(dirPath);
    } catch(e) { return arrayOfFiles; }

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (IGNORE_DIRS.includes(file)) return;

        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push({
                    path: fullPath,
                    size: stat.size,
                    isInPublic: fullPath.includes('public\\') || fullPath.includes('public/'),
                    isInServerUploads: fullPath.includes('server\\uploads') || fullPath.includes('server/uploads')
                });
            }
        } catch(e) {}
    });

    return arrayOfFiles;
};

console.log("🕵️ Escaneando todo el proyecto buscando los culpables del Bandwidth de Vercel...");
const allFiles = getAllFiles('.', []);

// Excluir archivos menores a 500KB para no saturar la lista
const heavyFiles = allFiles
    .filter(f => f.size > 500 * 1024)
    .sort((a, b) => b.size - a.size);

console.log(`\n======================================================`);
console.log(`🚀 TOP ARCHIVOS MÁS PESADOS EN TU PROYECTO (Potenciales parásitos de Vercel)`);
console.log(`======================================================\n`);

let publicSize = 0;
let totalSize = 0;

heavyFiles.slice(0, 30).forEach((f, idx) => {
    totalSize += f.size;
    if (f.isInPublic) publicSize += f.size;
    
    let label = '';
    if (f.isInPublic) label = '[PELIGRO: ESTÁ EN /PUBLIC -> Vercel lo carga]';
    if (f.isInServerUploads) label = '[LOCAL: server/uploads -> Seguro detrás de PM2/Cloudflare]';

    console.log(`${idx + 1}. ${formatBytes(f.size).padEnd(10)} | ${f.path} ${label}`);
});

console.log(`\n======================================================`);
console.log(`⚖️  RESUMEN DE CARGA`);
console.log(` Peso Total del Top 30: ${formatBytes(totalSize)}`);
console.log(` Peso en /public (Riesgo máximo de Fast Data Transfer): ${formatBytes(publicSize)}`);
console.log(`======================================================`);
