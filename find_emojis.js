import fs from 'fs';
import path from 'path';

const srcDir = './src';
// Match surrogate pairs and emoji patterns
const emojiRegex = /[\u2600-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

let results = [];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                const matches = line.match(emojiRegex);
                if (matches) {
                    results.push(`${fullPath}:${idx + 1}: ${line.trim()}`);
                }
            });
        }
    }
}

scanDir(srcDir);
fs.writeFileSync('./emojis_found.txt', results.join('\n'));
console.log(`Finished, wrote ${results.length} results.`);
