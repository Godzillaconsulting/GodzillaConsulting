const fs = require('fs');
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

// ─── FIX 2: Move drag priority above pan in handlePointerMove ─────────────────
// The current code after Fix1: "else if(isDraggingNode) setNodes..."
// We want node drag to take priority over pan
const oldPriority = `    if(connectingFrom) setConnectingToPos({x:nx, y:ny});
    else if(isDraggingNode) setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));`;

const newPriority = `    if(isDraggingNode) { setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n)); return; }
    if(connectingFrom) { setConnectingToPos({x:nx, y:ny}); return; }`;

if (content.includes(oldPriority)) {
  content = content.replace(oldPriority, newPriority);
  console.log('✅ Fix 2: node drag priority over panning');
} else {
  console.log('⚠️  Fix 2 still not matching, searching for close pattern...');
  const idx = content.indexOf('isDraggingNode) setNodes');
  if (idx > -1) {
    console.log('Found at char', idx, ':', content.substring(idx-50, idx+120));
  }
}

// ─── FIX 3: Fix canvas pointer down to ignore node-container clicks ───────────
// Find the function by offset
const canvasDownIdx = content.indexOf('const handleCanvasPointerDown = (e) => {');
if (canvasDownIdx > -1) {
  // Find the end of this function (next `};` after the start)
  const funcEnd = content.indexOf('};', canvasDownIdx);
  const oldFunc = content.substring(canvasDownIdx, funcEnd + 2);
  const newFunc = `const handleCanvasPointerDown = (e) => {
    // Don't start panning when clicking on a node (stopPropagation is set, this is a safety net)
    if (e.target.closest('.node-container')) return;
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setSelectedNodeId(null);
      setShowNodeMenu(false);
      setShowTemplateMenu(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };`;
  content = content.substring(0, canvasDownIdx) + newFunc + content.substring(funcEnd + 2);
  console.log('✅ Fix 3: canvas pointer down rewritten');
} else {
  console.log('⚠️  Fix 3: handleCanvasPointerDown not found');
}

// ─── FIX 4: Replace WhatsApp/TikTok/IG config with multi-action dropdown ──────
// Find the exact block start
const configStart = content.indexOf("['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (");
if (configStart > -1) {
  // Find the matching closing: look for )} after the content block
  // The block ends with: </div>\n              )}\n
  let depth = 0;
  let scanIdx = configStart;
  let foundEnd = -1;
  // Scan forward to find the closing )} of the JSX conditional
  for (let i = configStart; i < content.length - 2; i++) {
    if (content[i] === '(' && content[i-1] === '&' ) depth++;
    if (content[i] === ')' && content[i+1] === '}') {
      // Check if we're back at depth 0 by looking at the line
      const lineStart = content.lastIndexOf('\n', i);
      const lineContent = content.substring(lineStart, i+2).trim();
      if (lineContent === ')}') {
        foundEnd = i + 2;
        break;
      }
    }
  }
  
  if (foundEnd > -1) {
    const oldBlock = content.substring(configStart - 14, foundEnd); // include the {
    console.log('Found block length:', oldBlock.length);
    
    const newBlock = `['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-300 mb-1.5 block uppercase tracking-widest">⚡ Acción del Bot</label>
                    <select value={selectedNode.config?.action||'trigger_flow'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition">
                      <option value="trigger_flow">🔗 Disparar Flujo (al recibir msg)</option>
                      <option value="send_message">📤 Enviar Mensaje</option>
                      <option value="schedule_message">⏰ Agendar Mensaje</option>
                      {selectedNode.title === 'TikTok Bot' && <option value="post_content">🎬 Publicar Contenido TikTok</option>}
                      {selectedNode.title === 'TikTok Bot' && <option value="reply_comment">💬 Responder Comentario</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_story">📸 Publicar Story IG</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_feed">🖼️ Publicar en Feed IG</option>}
                    </select>
                  </div>
                  {(selectedNode.config?.action==='send_message') && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="Hola {{ $json.nombre }}!" rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                  {(!selectedNode.config?.action || selectedNode.config?.action==='trigger_flow') && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                      <p className="text-[9px] text-emerald-400 font-bold">🔗 Modo Trigger Activo</p>
                      <p className="text-[9px] text-emerald-500/70 mt-1 leading-relaxed">Cada mensaje disparará este flujo. Variables: <code className="bg-black/30 px-1 rounded">{'{{ $json.message }}'}</code> y <code className="bg-black/30 px-1 rounded">{'{{ $json.from }}'}</code></p>
                    </div>
                  )}
                  {['post_content','post_story','post_feed'].includes(selectedNode.config?.action) && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">URL de Media</label><input value={selectedNode.config?.mediaUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, mediaUrl:e.target.value}})} placeholder="{{ $json._contentPackage.imageUrl }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Caption</label><textarea value={selectedNode.config?.caption||''} onChange={e=>updateNode({config:{...selectedNode.config, caption:e.target.value}})} placeholder="{{ $json._contentPackage.tiktok.descripcion }}" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                  {selectedNode.config?.action==='schedule_message' && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario</label><input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Enviar a las (ISO)</label><input value={selectedNode.config?.sendAt||''} onChange={e=>updateNode({config:{...selectedNode.config, sendAt:e.target.value}})} placeholder="2025-05-01T09:00:00" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label><textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none transition"/></div>
                    </div>
                  )}
                </div>
              )}`;
    content = content.substring(0, configStart - 14) + newBlock + content.substring(foundEnd);
    console.log('✅ Fix 4: multi-action bot config replaced');
  } else {
    console.log('⚠️  Fix 4: could not find end of block');
  }
} else {
  console.log('⚠️  Fix 4: bot config block not found');
}

fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
console.log('\n✅ All fixes written to AutomationFlow.jsx');
