const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/import\.meta\.env\.VITE_API_URL/g, "''");
    fs.writeFileSync(p, c);
    console.log('Fixed', f);
});

['src/App.jsx', 'src/utils/analyticsHelper.js'].forEach(p => {
    const fPath = path.join(__dirname, p);
    if (fs.existsSync(fPath)) {
        let c = fs.readFileSync(fPath, 'utf8');
        c = c.replace(/import\.meta\.env\.VITE_API_URL/g, "''");
        fs.writeFileSync(fPath, c);
        console.log('Fixed', p);
    }
});
