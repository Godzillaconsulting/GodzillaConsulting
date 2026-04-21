const fs = require('fs');
let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/ProduccionAudiovisual.jsx';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(/"\)Epiphany/, '"Epiphany');
fs.writeFileSync(p, t, 'utf8');
console.log('Fixed produccion');
