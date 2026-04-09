const fs = require('fs');
const path = require('path');

const filesToPatch = [
    'Bots.jsx', 'ProduccionAudiovisual.jsx', 'OptimizacionWebSeo.jsx',
    'GestionRedesSociales.jsx', 'EmbudosDeVenta.jsx', 'CrmSaas.jsx',
    'Servicios.jsx', 'Hero.jsx', 'LandingPaqueteDynamic.jsx',
    'NivelExpansion.jsx', 'NivelElite.jsx'
];

const basePath = path.join(__dirname, '..', 'src', 'components');

for (const file of filesToPatch) {
    const fullPath = path.join(basePath, file);
    if (!fs.existsSync(fullPath)) continue;
    
    let source = fs.readFileSync(fullPath, 'utf8');

    // Reemplazar useEffect(..., [nodeData]) con useEffect(..., [JSON.stringify(nodeData)])
    const newSource = source.replace(/\}, \[nodeData\]\);/g, '}, [JSON.stringify(nodeData)]);');
    
    // Si tenían dependencia múltiple como [nodeData, isEnabled], la manera facil:
    // Mejor me aseguro con un regex seguro
    
    if (newSource !== source) {
        fs.writeFileSync(fullPath, newSource, 'utf8');
        console.log(`Patched useEffect in: ${file}`);
    }
}
