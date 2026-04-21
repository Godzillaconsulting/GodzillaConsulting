const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'middleware', 'wafService.js');
let content = fs.readFileSync(filePath, 'utf8');

// El problema: el array sqlInjectionPatterns no tiene cierre ]; antes de xssPatterns
// Línea 17 termina con la coma pero falta ]; antes de la línea 18 "const xssPatterns"
content = content.replace(
    /(\s*)\/\*\/\), \/\/ Comentarios SQL\n(const xssPatterns)/,
    '$1/\*\/), // Comentarios SQL\n];\n$2'
);

// Intentar también con el patrón exacto del archivo
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('Comentarios SQL') && !l.includes('xssPatterns'));
if (idx !== -1) {
    // Verificar que la siguiente linea sea const xssPatterns (sin el ]; de cierre)
    const nextNonEmpty = lines.slice(idx+1).findIndex(l => l.trim() !== '') + idx + 1;
    if (lines[nextNonEmpty] && lines[nextNonEmpty].includes('const xssPatterns')) {
        // Insertar ]; después de la línea de Comentarios SQL
        lines.splice(idx + 1, 0, '];');
        console.log('✅ Inserté ]; en línea', idx + 2);
    } else {
        console.log('ℹ️ La siguiente línea no vacía es:', lines[nextNonEmpty]);
        console.log('No se requiere corrección o ya fue corregido.');
    }
} else {
    console.log('❌ No encontré la línea de Comentarios SQL');
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Archivo guardado.');
