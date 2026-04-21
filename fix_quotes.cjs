const fs = require('fs');
const files = ['Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx', 'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx'];

files.forEach(f => {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + f;
    if (!fs.existsSync(p)) return;
    let t = fs.readFileSync(p, 'utf8');

    // Mltiples ocurrencias por culpa del RegEx goloso!
    // Ej: "Secuencias ")Soap Opera\" -> "Secuencias \"Soap Opera\"
    t = t.replace(/"\)([^"]+)\\"/g, '\\"$1\\"');
    
    // A veces es sólo la primera comilla que se rompió: `")Soap Opera\"` -> `"Soap Opera\"`
    t = t.replace(/"\)/g, '"');

    fs.writeFileSync(p, t, 'utf8');
});

console.log('Fixed quotes across all components');
