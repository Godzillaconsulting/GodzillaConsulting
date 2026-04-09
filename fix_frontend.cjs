const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const dirPath = path.join(__dirname, 'src');

walkDir(dirPath, (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        let modified = false;

        // Patron 1: const ALGO = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const regex1 = /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*import\.meta\.env\.DEV\s*\?\s*['"]http:\/\/localhost:3000['"]\s*:\s*['"]['"]\s*;/g;
        
        if (regex1.test(content)) {
            content = content.replace(regex1, "$1 $2 = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');");
            modified = true;
        }

        // Patron 2 (ya parchado parcialmente en sesiones previas): const ALGO = import.meta.env.DEV ? 'http://localhost:3000' : (import.meta.env.VITE_API_URL || '');
        const regex2 = /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*import\.meta\.env\.DEV\s*\?\s*['"]http:\/\/localhost:3000['"]\s*:\s*\(\s*import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"]['"]\s*\)\s*;/g;
        
        if (regex2.test(content)) {
            content = content.replace(regex2, "$1 $2 = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});
