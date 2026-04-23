const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'AdminStudio.jsx');
let c = fs.readFileSync(file, 'utf8');

// ── PATCH 1: Agregar boton Eliminar en header del grupo numerado (Tab Textos) ──
const groupDivStart = '<div key={num} className="bg-neutral-900 rounded-xl p-3 space-y-2 border border-neutral-800">';
const idx1 = c.indexOf(groupDivStart);
console.log('Patch 1 - group div found at:', idx1);

if (idx1 >= 0) {
  const afterDiv = c.substring(idx1 + groupDivStart.length);
  // Ver qué sigue exactamente
  console.log('After div (raw):', JSON.stringify(afterDiv.substring(0, 100)));
  
  // El pTag exacto (con un espacio antes de <p)
  const pTag = '\r\n <p className="text-[10px] text-neutral-500 font-bold">#{num}</p>';
  if (afterDiv.startsWith(pTag)) {
    const replacement = groupDivStart +
      '\r\n  <div className="flex items-center justify-between">' +
      '\r\n    <p className="text-[10px] text-neutral-500 font-bold">#{num}</p>' +
      '\r\n    <button' +
      '\r\n      title="Eliminar este elemento por completo"' +
      '\r\n      onClick={() => {' +
      '\r\n        setDraftData(prev => {' +
      '\r\n          const next = { ...prev };' +
      '\r\n          Object.keys(next).forEach(k => {' +
      '\r\n            const m = k.match(/^([a-zA-Z]+?)(\\d+)([A-Z][a-zA-Z]*)$/);' +
      '\r\n            if (m && m[1] === prefix && m[2] === num) delete next[k];' +
      '\r\n          });' +
      '\r\n          return next;' +
      '\r\n        });' +
      '\r\n      }}' +
      '\r\n      className="px-2 py-1 text-[10px] font-black text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center gap-1"' +
      '\r\n    >' +
      '\r\n      Eliminar' +
      '\r\n    </button>' +
      '\r\n  </div>';
    c = c.substring(0, idx1) + replacement + afterDiv.substring(pTag.length);
    console.log('Patch 1 applied!');
  } else {
    console.log('Patch 1 FAILED - trying alternate pTag detection');
  }
}

// ── PATCH 2: Agregar boton Eliminar en cada slot de media numerado (Tab Media) ──
const mediaMapStart = 'mediaFields.map(([key, val]) => (';
const idx2 = c.indexOf(mediaMapStart);
console.log('Patch 2 - mediaFields.map found at:', idx2);

if (idx2 >= 0) {
  // Encontrar el fin buscando lo que viene después del bloque
  // Buscar '))}' seguido de nueva línea y luego {selectedNodeId
  const searchAfter = c.substring(idx2 + mediaMapStart.length);
  
  // Encontrar la siguiente sección después del bloque de media
  const possibleEnds = [
    "\r\n\r\n  {selectedNodeId === 'hero'",
    "\r\n\r\n   {selectedNodeId === 'hero'",
    "\r\n\r\n  {selectedNodeId === 'portafolio'",
    "\r\n\r\n  {selectedNodeId === 'recursos'",
  ];
  
  let endFound = -1;
  let endStr = '';
  for (const end of possibleEnds) {
    const ei = c.indexOf(end, idx2);
    if (ei >= 0 && (endFound < 0 || ei < endFound)) {
      endFound = ei;
      endStr = end;
    }
  }
  
  console.log('Patch 2 end found at:', endFound, 'endStr:', JSON.stringify(endStr));
  
  if (endFound >= 0) {
    const before = c.substring(0, idx2 - 2); // Strip leading '  {'
    const after = c.substring(endFound);
    
    const newMediaBlock = `  {mediaFields.map(([key, val]) => {
  const grpMatch = key.match(/^([a-zA-Z]+?)(\\d+)([A-Z][a-zA-Z]*)$/);
  return (
  <EditorField key={key} fieldKey={key} onHover={setHoveredField}>
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-yellow-500">
          {toLabel(key)}
        </span>
        {grpMatch && (
          <button
            title="Eliminar este elemento completo"
            onClick={() => {
              const [, grpPfx, grpNum] = grpMatch;
              setDraftData(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => {
                  const m = k.match(/^([a-zA-Z]+?)(\\d+)([A-Z][a-zA-Z]*)$/);
                  if (m && m[1] === grpPfx && m[2] === grpNum) delete next[k];
                });
                return next;
              });
            }}
            className="px-2 py-1 text-[10px] font-black text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center gap-1"
          >
            Eliminar
          </button>
        )}
      </div>
      <MediaPicker
        label={\`\`}
        value={val ||''}
        onChange={url => change(key, url)}
        accept={key.toLowerCase().includes('video') ?'video' :'all'}
      />
    </div>
  </EditorField>
  );
  })}`;
    
    c = before + newMediaBlock + after;
    console.log('Patch 2 applied!');
  } else {
    // show what comes after the mediaFields block
    console.log('Could not find end. Searching for ))}, after mediaFields:');
    const closeIdx = c.indexOf('))}\r\n', idx2);
    console.log('Close ))}\r\n at:', closeIdx);
    if (closeIdx > 0) {
      console.log('After close:', JSON.stringify(c.substring(closeIdx, closeIdx + 100)));
    }
  }
}

fs.writeFileSync(file, c, 'utf8');
console.log('File saved.');
