const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  const fpath = ws + 'StudioPreview.jsx';
  if (!fs.existsSync(fpath)) return;
  
  let content = fs.readFileSync(fpath, 'utf8');

  // Regex replacement to catch both lines
  content = content.replace(
      /{d\.videoFileUrl && \([\s\S]*?<video src={d\.videoFileUrl} [\s\S]*?\([\s\S]*?{!d\.videoFileUrl && <div/m,
      `{(d.videoFileUrl || d.videoUrl) && (
 <video src={d.videoFileUrl || d.videoUrl} autoPlay muted loop playsInline className="w-full max-w-md mx-auto rounded-3xl shadow-2xl mb-6 object-cover" style={{ maxHeight:'300px' }} />
 )}
 {!(d.videoFileUrl || d.videoUrl) && <div`
  );
  
  fs.writeFileSync(fpath, content, 'utf8');
  console.log('Fixed StudioPreview.jsx video url fallback in ' + fpath);
});
