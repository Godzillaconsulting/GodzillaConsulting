import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src', 'assets');
const destDir = path.join(process.cwd(), 'server', 'uploads', 'assets');

// Asegurar que la carpeta destino exista
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Extensiones pesadas prohibidas en Vercel
const heavyExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.pdf', '.gif'];

function moveHeavyFilesRecursive(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
        const fullPath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            moveHeavyFilesRecursive(fullPath);
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (heavyExtensions.includes(ext) || stat.size > 2 * 1024 * 1024) { // Si es video o > 2MB
                const fileName = path.basename(fullPath);
                const destPath = path.join(destDir, fileName);
                try {
                    fs.renameSync(fullPath, destPath);
                    console.log(`✅ Movido: ${fileName} -> server/uploads/assets/`);
                } catch (e) {
                    console.error(`❌ Error moviendo ${fileName}:`, e.message);
                }
            }
        }
    }
}

console.log("🚀 MODO ARQUITECTO DE CRISIS: MOVIENDO VIDEOS PESADOS A LA NUBE LOCAL...");
moveHeavyFilesRecursive(srcDir);
console.log("🏁 MUDANZA TERMINADA. Todos los videos fueron extraídos de la mira de Vercel.");
