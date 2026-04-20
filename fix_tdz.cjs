const fs = require('fs');
const files = ['Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx', 'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx'];

files.forEach(f => {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + f;
    let t = fs.readFileSync(p, 'utf8');

    // Remove the declarations from below accordionItems
    let declarationsRegex = /    const \{ t, i18n \} = useTranslation\(\);\s+const isEng = !i18n\.resolvedLanguage\?\.startsWith\('es'\);\s+/;
    let match = t.match(declarationsRegex);
    
    if (match) {
        t = t.replace(declarationsRegex, '');
        
        // Find where `const accordionItems = [` is and insert the declarations right before it
        let insertPos = t.indexOf('    const accordionItems = [');
        if (insertPos !== -1) {
            t = t.slice(0, insertPos) + match[0] + t.slice(insertPos);
            fs.writeFileSync(p, t, 'utf8');
            console.log('Fixed TDZ in ' + f);
        } else {
            console.log('Could not find accordionItems in ' + f);
        }
    } else {
        console.log('Could not find declarations block in ' + f);
    }
});
