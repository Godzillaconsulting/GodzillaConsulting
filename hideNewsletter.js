import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src', 'components');
const files = [
    'Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx',
    'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx',
    'NivelEsencial.jsx', 'NivelExpansion.jsx', 'NivelElite.jsx'
];

files.forEach(file => {
    const fp = path.join(srcDir, file);
    if (!fs.existsSync(fp)) return;
    let content = fs.readFileSync(fp, 'utf8');

    content = content.replace(/<ContactForm \/>/g, '<ContactForm showNewsletter={false} />');

    fs.writeFileSync(fp, content);
});

console.log('Fixed ContactForm props in landings.');
