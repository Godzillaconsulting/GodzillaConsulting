const fs = require('fs');

function fix(file, bad, good) {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + file;
    let t = fs.readFileSync(p, 'utf8');
    t = t.replace(bad, good);
    fs.writeFileSync(p, t, 'utf8');
}

fix('ProduccionAudiovisual.jsx', 'emocionalmente." },', 'emocionalmente.") },');
fix('EmbudosDeVenta.jsx', 'convertir." },', 'convertir.") },');
fix('GestionRedesSociales.jsx', 'diariamente." },', 'diariamente.") },');

console.log('Fixed strings exactly');
