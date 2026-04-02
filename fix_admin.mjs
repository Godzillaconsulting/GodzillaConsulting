import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/AdminStudio.jsx';
let c = readFileSync(path, 'utf8');

// Find it by using the content after the LGTM gap-3 div
const startMarker = 'className="flex items-center gap-3">\r\n  <button onClick={() => setShowPreview(p => !p)';
const endMarker = '{/* Cuerpo */}';

let startIdx = c.indexOf(startMarker);
// Walk back to the `<div` that starts this section
startIdx = c.lastIndexOf('  <div ', startIdx);

const endIdx = c.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find markers. startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

console.log('startIdx:', startIdx, 'endIdx:', endIdx);
console.log('Replacing:', JSON.stringify(c.slice(startIdx, startIdx + 200)));

const before = c.slice(0, startIdx);
const after = c.slice(endIdx);

const fixedSection = `  <div className="flex items-center gap-2">
    <button onClick={() => setShowPreview(p => !p)} className={\`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm border border-transparent \${showPreview ?'bg-white/90 text-[#CC0000] border-[#CC0000]/50 shadow-md' :'bg-black/40 text-[#CC0000] hover:bg-white hover:border-[#CC0000]/50'}\`}>
      {showPreview ?'◧ Ocultar' :'▣ Visualizar'}
    </button>
    <div className="flex flex-col items-end">
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !selectedNodeId || !isRecursosValid || adminProfile?.role === 'cm' || adminProfile?.id === 4} className={\`px-5 py-2 text-xs font-black rounded-xl border transition-all shadow-md active:scale-95 disabled:opacity-50 \${hasUnsavedChanges ? 'bg-yellow-400 border-yellow-500 text-black' : 'bg-white hover:bg-gray-100 text-[#CC0000] border-[#CC0000]/50'}\`}>
          {saving ?'...' : hasUnsavedChanges ? '⚠️ Guardar Borrador*' : '💾 Borrador Guardado'}
        </button>
        <button onClick={() => setShowPublishModal(true)} disabled={!selectedNodeId || !isRecursosValid || adminProfile?.role === 'cm' || adminProfile?.id === 4} className="px-6 py-2 bg-gradient-to-r from-[#CC0000] to-[#880000] hover:from-red-500 hover:to-red-700 text-white text-xs font-black rounded-xl transition-all shadow-[0_4px_15px_rgba(204,0,0,0.5)] border border-red-900/30 active:scale-95 disabled:opacity-50">
          🚀 Publicar al Vivo
        </button>
      </div>
      {hasUnsavedChanges && <p className="text-[9px] text-yellow-400 font-bold mt-0.5">⚠ Guarda → luego Publica para ver en el sitio</p>}
    </div>
  </div>
  </div>

  `;

writeFileSync(path, before + fixedSection + after);
console.log('Fixed! New length:', (before + fixedSection + after).length);
