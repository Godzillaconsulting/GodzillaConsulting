const fs = require('fs');
const path = require('path');

const searchDirs = [
    'C:\\Users\\GODZILLA.IA\\Internet Venta',
    'C:\\Users\\GODZILLA.IA\\Terapias',
    'C:\\Users\\GODZILLA.IA\\GodzillaConsulting'
];

const patterns = [/\bqp\b/i, /queplan/i, /que-plan/i];

function searchFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            for (const pat of patterns) {
                if (pat.test(line)) {
                    console.log(`${filePath}:${index + 1}: ${line.trim()}`);
                    break;
                }
            }
        });
    } catch (e) {
        // Skip binary files or unreadable files
    }
}

function traverse(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file === 'node_modules' || file === 'dist' || file === '.git' || file === '.vercel' || file === '.wwebjs_cache') {
                continue;
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                traverse(fullPath);
            } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.bat') || file.endsWith('.sh') || file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.env'))) {
                searchFile(fullPath);
            }
        }
    } catch (e) {
        console.error(`Error reading directory ${dir}:`, e.message);
    }
}

console.log("Starting search for QP/queplan...");
for (const dir of searchDirs) {
    console.log(`\nSearching in: ${dir}`);
    traverse(dir);
}
console.log("\nSearch complete.");
