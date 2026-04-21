const fs = require('fs');
const files = ['Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx', 'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx'];

files.forEach(f => {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + f;
    if (!fs.existsSync(p)) return;
    let t = fs.readFileSync(p, 'utf8');

    t = t.replace(/Context';\\nimport/g, "Context';\nimport");
    t = t.replace(/useTranslation\(\);\\n/g, "useTranslation();\n");
    t = t.replace(/'es'\);\\n/g, "'es');\n");
    t = t.replace(/  const isEng /g, "    const isEng ");
    t = t.replace(/  const { getNodeData/g, "    const { getNodeData");

    fs.writeFileSync(p, t, 'utf8');
});

console.log('Fixed newlines');
