const fs = require('fs');
const files = ['Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx', 'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx'];

files.forEach(f => {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + f;
    if (!fs.existsSync(p)) return;
    let t = fs.readFileSync(p, 'utf8');

    // Restaurar los parentesis borrados por el script ingenuo anterior
    // t("...") : -> t("...") : no, es t("..." : -> t("...") :
    t = t.replace(/t\("([^"]+)" :/g, 't("$1") :');

    fs.writeFileSync(p, t, 'utf8');
});

console.log('Restored parentheses in t() calls');
