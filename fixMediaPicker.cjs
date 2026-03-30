const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  if (!fs.existsSync(ws)) return;

  const fpath = ws + 'MediaPicker.jsx';
  if (!fs.existsSync(fpath)) return;
  
  let content = fs.readFileSync(fpath, 'utf8');

  // Fix 1: API path
  content = content.replace(
      "const API = 'http://localhost:3000';",
      "const API = import.meta.env.DEV ? 'http://localhost:3000' : '';"
  );
  
  // Fix 2: Add Drag and Drop Handlers
  const targetDiv = `                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full max-w-sm border-2 border-dashed border-neutral-600 hover:border-[#CC0000] rounded-2xl p-10 cursor-pointer transition-all text-center group"
                                            >`;

  const replacementDiv = `                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                        const file = e.dataTransfer.files[0];
                                                        handleFileUpload({ target: { files: [file] } });
                                                    }
                                                }}
                                                className="w-full max-w-sm border-2 border-dashed border-neutral-600 hover:border-[#CC0000] hover:bg-[#CC0000]/10 border-[#CC0000]/50 rounded-2xl p-10 cursor-pointer transition-all text-center group"
                                            >`;

  content = content.replace(targetDiv, replacementDiv);
  
  fs.writeFileSync(fpath, content, 'utf8');
  console.log('Fixed MediaPicker.jsx API and DND routes in ' + fpath);
});
