const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\GODZILLA.IA\\Internet Venta\\crm-ventas-bot\\frontend\\src';

function searchFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('qr') || line.toLowerCase().includes('status')) {
                console.log(`${filePath}:${index + 1}: ${line.trim()}`);
            }
        });
    } catch (e) {
        // Skip
    }
}

function traverse(d) {
    try {
        const files = fs.readdirSync(d);
        for (const file of files) {
            const fullPath = path.join(d, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                traverse(fullPath);
            } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.vue') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
                searchFile(fullPath);
            }
        }
    } catch (e) {
        // Ignore
    }
}

console.log("Searching in frontend/src...");
traverse(dir);
console.log("Done.");
