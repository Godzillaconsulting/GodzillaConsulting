import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../../src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  let initContent = content;

  content = content.replace(/const gifBot =.*?Bot\.gif['"`];/g, "const gifBot = '/assets/icons/Bot.gif';");
  content = content.replace(/const gifVideo =.*?Video\.gif['"`];/g, "const gifVideo = '/assets/icons/Video.gif';");
  content = content.replace(/const gifEmbudo =.*?Embudo\.gif['"`];/g, "const gifEmbudo = '/assets/icons/Embudo.gif';");
  content = content.replace(/const gifRedes =.*?Redes(%20|\s)Sociales\.gif['"`];/g, "const gifRedes = '/assets/icons/Redes%20Sociales.gif';");
  content = content.replace(/const gifSeo =.*?Red(%20|\s)Social(%20|\s)Optimizar\.gif['"`];/g, "const gifSeo = '/assets/icons/Red%20Social%20Optimizar.gif';");
  content = content.replace(/const gifCrm =.*?Estadistica\.gif['"`];/g, "const gifCrm = '/assets/icons/Estadistica.gif';");

  if (content !== initContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', f);
  }
});
