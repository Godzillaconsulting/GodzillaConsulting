const fs = require('fs');

let p1 = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/ProduccionAudiovisual.jsx';
let t1 = fs.readFileSync(p1, 'utf8');
t1 = t1.replace(/\"\)(Epiphany Bridge)\\"/g, '\\"$1\\"');
fs.writeFileSync(p1, t1, 'utf8');

let p2 = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/EmbudosDeVenta.jsx';
let t2 = fs.readFileSync(p2, 'utf8');
t2 = t2.replace(/\"\)(Soap Opera)\\"/g, '\\"$1\\"');
fs.writeFileSync(p2, t2, 'utf8');

let p3 = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/GestionRedesSociales.jsx';
let t3 = fs.readFileSync(p3, 'utf8');
t3 = t3.replace(/\"\)(Dream 100)\\'/g, "\\'$1\\'");
fs.writeFileSync(p3, t3, 'utf8');

console.log('Fixed specific quotes safely');
