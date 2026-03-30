import fs from 'fs';

let recursos = fs.readFileSync('src/components/Recursos.jsx', 'utf8');

recursos = recursos.replace(
    /let slug = `recurso\$\{activeItem\?\.id \|\| activeItem\?\.orden \|\| 1\}`;[\s\S]*?if \(activeItem\?\.slug\) slug = activeItem\.slug;/,
    "let slug = `recurso${activeItem?.id || activeItem?.orden || 1}`; // Forzamos que siempre sea recursoX para Node.js"
);

fs.writeFileSync('src/components/Recursos.jsx', recursos);
console.log("Recursos.jsx patched");
