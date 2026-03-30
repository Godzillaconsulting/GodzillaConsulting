const fs = require('fs');
const files = [
  {file: 'Bots.jsx', id: 'bots', oldSlug: 'bots'},
  {file: 'ProduccionAudiovisual.jsx', id: 'audiovisual', oldSlug: 'audiovisual'},
  {file: 'EmbudosDeVenta.jsx', id: 'embudos', oldSlug: 'embudos'},
  {file: 'GestionRedesSociales.jsx', id: 'redes', oldSlug: 'redes'},
  {file: 'OptimizacionWebSeo.jsx', id: 'seo', oldSlug: 'seo'},
  {file: 'CrmSaas.jsx', id: 'crm', oldSlug: 'crm'}
];
const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  files.forEach(({file, id, oldSlug}) => {
    let content = fs.readFileSync(ws + file, 'utf8');
    content = content.replace(/import { client } from '\.\.\/sanityClient';/, "import { useSiteData } from '../context/SiteContext';");
    
    // Some might have "// Fetch content from Sanity" with different spacing
    const replaceEffect = `    const { getNodeData } = useSiteData();
    const nodeData = getNodeData('servicio-${id}');

    useEffect(() => {
        window.scrollTo(0, 0);
        if (nodeData && Object.keys(nodeData).length > 0) {
            setContent(Object.assign({}, defaultContent, nodeData));
        }
    }, [nodeData]);`;

    const regex = new RegExp(`    useEffect\\(\\\(\\\) => {\\s*window\\.scrollTo\\(0, 0\\);\\s*(\\/\\/ Fetch content from Sanity\\s*)?client\\.fetch[^]*?}, \\[\\]\\);`);
    
    content = content.replace(regex, replaceEffect);
    fs.writeFileSync(ws + file, content, 'utf8');
  });
});
console.log('Done mapping components to SiteContext!');
