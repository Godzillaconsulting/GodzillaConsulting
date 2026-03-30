const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  const fpath = ws + 'Servicios.jsx';
  if (!fs.existsSync(fpath)) return;
  
  let content = fs.readFileSync(fpath, 'utf8');

  // Fix 1: Desktop Layout
  content = content.replace(
      '{renderIconImg(srv, isActive)}',
      '{renderIconImg(srv, isActive, idx)}'
  );
  
  // Fix 2: Mobile Layout (there might be two instances, replace all)
  content = content.replace(
      '{renderIconImg(srv, isActive)}',
      '{renderIconImg(srv, isActive, idx)}'
  );
  
  fs.writeFileSync(fpath, content, 'utf8');
  console.log('Fixed icon mapping in ' + fpath);
});
