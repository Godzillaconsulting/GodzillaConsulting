import fs from 'fs';
import path from 'path';

const CLOUDFLARE_BASE = 'https://bot.godzillaconsulting.ai/api/media/assets/';
const srcDirs = [
    path.join(process.cwd(), 'src', 'components'),
    path.join(process.cwd(), 'src', 'utils')
];

// Regex para atrapar imports de gifs
const regexGifs = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"](?:\.\.\/)*assets\/Gifs\/([^'"]+\.gif)['"];/g;
const regexPdfs = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"](?:\.\.\/)*assets\/([^'"]+\.pdf)['"];/g;

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

            if (regexGifs.test(content)) {
                content = content.replace(regexGifs, (match, varName, fileName) => {
                    const newCode = `const ${varName} = '${CLOUDFLARE_BASE}${fileName}';`;
                    console.log(`🔧 GIF: ${path.basename(fullPath)} -> ${CLOUDFLARE_BASE}${fileName}`);
                    return newCode;
                });
                modified = true;
            }

            if (regexPdfs.test(content)) {
                content = content.replace(regexPdfs, (match, varName, fileName) => {
                    const newCode = `const ${varName} = '${CLOUDFLARE_BASE}${fileName}';`;
                    console.log(`🔧 PDF: ${path.basename(fullPath)} -> ${CLOUDFLARE_BASE}${fileName}`);
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

processDirectory(srcDirs[0]);
processDirectory(srcDirs[1]);
