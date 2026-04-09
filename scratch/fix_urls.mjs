import fs from 'fs';
import path from 'path';

const srcDir = './src/components';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));

let changed = 0;
for (const file of files) {
    const fullPath = path.join(srcDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const newContent = content.replace(/https:\/\/bot\.godzillaconsulting\.ai\/api\/media\/assets/g, '/api/media/assets');
    
    if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Fixed', file);
        changed++;
    }
}
console.log(`Updated ${changed} files.`);
