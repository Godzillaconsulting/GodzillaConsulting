import fs from 'fs';
import path from 'path';

const CLOUDFLARE_BASE = 'https://bot.godzillaconsulting.ai/api/media/assets/';
const srcDirs = [
    path.join(process.cwd(), 'src', 'components'),
    path.join(process.cwd(), 'src', 'utils')
];

// Regex para atrapar imports de assets de video
// ej: import bgVideo from '../assets/video.mp4';
const regex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"](?:\.\.\/)*assets\/([^'"]+\.(?:mp4|mov|webm|pdf))['"];/g;
// Regex para URLs peladas en config temporales
const regexQuotes = /['"](?:\.\.\/)*assets\/([^'"]+\.(?:mp4|mov|webm|pdf))['"]/g;

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Reemplazo de Imports directos
            if (regex.test(content)) {
                content = content.replace(regex, (match, varName, fileName) => {
                    const newCode = `const ${varName} = '${CLOUDFLARE_BASE}${fileName}';`;
                    console.log(`🔧 ${path.basename(fullPath)}: Cambio import por -> ${CLOUDFLARE_BASE}${fileName}`);
                    return newCode;
                });
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf-8');
            }
        }
    }
}

console.log("🛠️ Inyectando Bypass de Cloudflare en los componentes de React...");
srcDirs.forEach(processDirectory);
console.log("✅ Inyección finalizada.");
