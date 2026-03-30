const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

const filesToUpdate = [
    'ProduccionAudiovisual.jsx',
    'GestionRedesSociales.jsx',
    'EmbudosDeVenta.jsx',
    'OptimizacionWebSeo.jsx',
    'CrmSaas.jsx'
];

workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  filesToUpdate.forEach(file => {
      let fpath = ws + file;
      if (!fs.existsSync(fpath)) return;
      let content = fs.readFileSync(fpath, 'utf8');

      content = content.replace(
          '<p className="text-white text-lg md:text-xl mb-6 leading-relaxed font-medium hidden">',
          '<p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">'
      );

      fs.writeFileSync(fpath, content, 'utf8');
      console.log('Restored subtitle in ' + file);
  });
});
