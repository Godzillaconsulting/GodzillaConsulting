const fs = require('fs');
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

// ─── FIX 1: draggingNodeId → isDraggingNode (the core drag bug) ───────────────
content = content.replace(
  'else if(draggingNodeId) setNodes(p=>p.map(n=>n.id===draggingNodeId ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));',
  'else if(isDraggingNode) setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));'
);
console.log('✅ Fix 1: drag variable name corrected');

// ─── FIX 2: isPanning should not swallow moves when also dragging a node ──────
// The drag move currently returns early when isPanning. Fix: only pan if no node is being dragged
const oldMoveHandler = `  const handlePointerMove = (e) => {
    if(!canvasRef.current) return;
    
    if (isPanning) {
      canvasRef.current.scrollLeft -= e.movementX;
      canvasRef.current.scrollTop -= e.movementY;
      return;
    }

    const cr = canvasRef.current.getBoundingClientRect();
    const nx = (e.clientX - cr.left + canvasRef.current.scrollLeft) / zoom;
    const ny = (e.clientY - cr.top + canvasRef.current.scrollTop) / zoom;
    
    if(connectingFrom) setConnectingToPos({x:nx, y:ny});
    else if(isDraggingNode) setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));
  };`;

const newMoveHandler = `  const handlePointerMove = (e) => {
    if(!canvasRef.current) return;

    const cr = canvasRef.current.getBoundingClientRect();
    const nx = (e.clientX - cr.left + canvasRef.current.scrollLeft) / zoom;
    const ny = (e.clientY - cr.top + canvasRef.current.scrollTop) / zoom;

    // Node drag takes priority over canvas pan
    if(isDraggingNode) {
      setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));
      return;
    }
    if(connectingFrom) { setConnectingToPos({x:nx, y:ny}); return; }
    if (isPanning) {
      canvasRef.current.scrollLeft -= e.movementX;
      canvasRef.current.scrollTop -= e.movementY;
    }
  };`;

if (content.includes(oldMoveHandler)) {
  content = content.replace(oldMoveHandler, newMoveHandler);
  console.log('✅ Fix 2: pointer move handler reordered');
} else {
  // Try partial replacement of just the priority logic after Fix 1
  console.log('ℹ️  Fix 2: trying partial match...');
  const partialOld = `if(connectingFrom) setConnectingToPos({x:nx, y:ny});
    else if(isDraggingNode) setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n));`;
  const partialNew = `if(isDraggingNode) { setNodes(p=>p.map(n=>n.id===isDraggingNode ? {...n, x: nx - dragOffset.x, y: ny - dragOffset.y} : n)); return; }
    if(connectingFrom) { setConnectingToPos({x:nx, y:ny}); return; }`;
  if (content.includes(partialOld)) {
    content = content.replace(partialOld, partialNew);
    console.log('✅ Fix 2: partial handler fix applied');
  } else {
    console.log('⚠️  Fix 2: could not find pattern');
  }
}

// ─── FIX 3: handleCanvasPointerDown should NOT fire when clicking a node ──────
// The problem: clicking a node triggers both node down AND canvas down (bubbling)
// Solution: the canvas handler already checks e.target === canvasRef.current, but we
// should also prevent panning when a node drag is starting
const oldCanvasDown = `  const handleCanvasPointerDown = (e) => {
    if (e.button === 1 || e.target === canvasRef.current || e.target.closest('.canvas-bg')) {
      setIsPanning(true);
      setSelectedNodeId(null);
      setShowNodeMenu(false);
      setShowTemplateMenu(false);
      e.target.setPointerCapture(e.pointerId);
    }
  };`;

const newCanvasDown = `  const handleCanvasPointerDown = (e) => {
    // Don't start panning if a node is being clicked (node's stopPropagation should catch this,
    // but as a safety net: don't pan if the click target is inside a node-container)
    if (e.target.closest('.node-container')) return;
    if (e.button === 1 || e.button === 0) {
      setIsPanning(true);
      setSelectedNodeId(null);
      setShowNodeMenu(false);
      setShowTemplateMenu(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };`;

if (content.includes(oldCanvasDown)) {
  content = content.replace(oldCanvasDown, newCanvasDown);
  console.log('✅ Fix 3: canvas pointer down improved');
} else {
  console.log('⚠️  Fix 3: canvas pointer down pattern not found, skipping');
}

// ─── FIX 4: Add sub-action dropdown config to multi-function bot nodes ────────
// Find the existing WhatsApp Bot config block and REPLACE it with one that includes action dropdown
const oldWAConfig = `              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Destinatario / Teléfono</label>
                    <input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="Ej: {{ $json.telefono }} o 521656..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 mb-1 block">Mensaje / Fallback Reply</label>
                    <textarea value={selectedNode.config?.fallback||''} onChange={e=>updateNode({config:{...selectedNode.config, fallback:e.target.value}})} placeholder="Hola {{ $json.nombre }}, recibimos tu solicitud." rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/>
                  </div>
                </div>
              )}`;

const newWAConfig = `              {['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (
                <div className="space-y-3">
                  {/* Sub-action selector */}
                  <div>
                    <label className="text-[10px] font-bold text-neutral-300 mb-1 block uppercase tracking-widest">⚡ Acción del Bot</label>
                    <select value={selectedNode.config?.action||'trigger_flow'} onChange={e=>updateNode({config:{...selectedNode.config, action:e.target.value}})} className="w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition">
                      <option value="trigger_flow">🔗 Disparar Flujo (al recibir mensaje)</option>
                      <option value="send_message">📤 Enviar Mensaje Saliente</option>
                      <option value="reply_context">💬 Responder con IA (ctx anterior)</option>
                      <option value="schedule_message">⏰ Agendar Mensaje</option>
                      {selectedNode.title === 'TikTok Bot' && <option value="post_content">🎬 Publicar Contenido</option>}
                      {selectedNode.title === 'TikTok Bot' && <option value="reply_comment">💬 Responder Comentario</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_story">📸 Publicar Story</option>}
                      {selectedNode.title === 'IG / Messenger Bot' && <option value="post_feed">🖼️ Publicar en Feed</option>}
                    </select>
                  </div>
                  {/* Conditional fields based on action */}
                  {(selectedNode.config?.action||'trigger_flow') === 'send_message' && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario / Teléfono</label>
                      <input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }} o 521656..." className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label>
                      <textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="Hola {{ $json.nombre }}! Tu cita es el {{ $json.fecha }}." rows={3} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/></div>
                    </div>
                  )}
                  {(selectedNode.config?.action||'trigger_flow') === 'trigger_flow' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                      <p className="text-[9px] text-emerald-400 font-bold">🔗 Modo Trigger Activo</p>
                      <p className="text-[9px] text-emerald-500/70 mt-1 leading-relaxed">Cada mensaje/comentario recibido disparará este flujo. Los datos del mensaje estarán disponibles como <code className="bg-emerald-900/30 px-1 rounded">{'{{ $json.message }}'}</code>, <code className="bg-emerald-900/30 px-1 rounded">{'{{ $json.from }}'}</code>.</p>
                    </div>
                  )}
                  {['post_content','post_story','post_feed'].includes(selectedNode.config?.action) && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">URL de Imagen/Video</label>
                      <input value={selectedNode.config?.mediaUrl||''} onChange={e=>updateNode({config:{...selectedNode.config, mediaUrl:e.target.value}})} placeholder="{{ $json.imageUrl }} o URL directa" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Caption / Descripción</label>
                      <textarea value={selectedNode.config?.caption||''} onChange={e=>updateNode({config:{...selectedNode.config, caption:e.target.value}})} placeholder="{{ $json._contentPackage.tiktok.descripcion }}" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/></div>
                    </div>
                  )}
                  {selectedNode.config?.action === 'schedule_message' && (
                    <div className="space-y-2">
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Destinatario</label>
                      <input value={selectedNode.config?.to||''} onChange={e=>updateNode({config:{...selectedNode.config, to:e.target.value}})} placeholder="{{ $json.telefono }}" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Fecha/Hora (ISO)</label>
                      <input value={selectedNode.config?.sendAt||''} onChange={e=>updateNode({config:{...selectedNode.config, sendAt:e.target.value}})} placeholder="{{ $json.fecha }} o 2025-05-01T09:00:00" className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none transition"/></div>
                      <div><label className="text-[10px] text-neutral-400 mb-1 block">Mensaje</label>
                      <textarea value={selectedNode.config?.message||''} onChange={e=>updateNode({config:{...selectedNode.config, message:e.target.value}})} placeholder="Recordatorio: {{ $json.evento }}" rows={2} className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition resize-none"/></div>
                    </div>
                  )}
                </div>
              )}`;

if (content.includes(oldWAConfig)) {
  content = content.replace(oldWAConfig, newWAConfig);
  console.log('✅ Fix 4: WhatsApp/TikTok/IG multi-action dropdown added');
} else {
  console.log('⚠️  Fix 4: old config block not found exactly, trying trimmed search...');
  // Try to find a good enough match
  const simpleSearch = "['WhatsApp Bot', 'TikTok Bot', 'IG / Messenger Bot'].includes(selectedNode.title) && (";
  const idx = content.indexOf(simpleSearch);
  if (idx !== -1) {
    console.log('Found at position', idx);
  }
}

fs.writeFileSync('src/components/AutomationFlow.jsx', content, 'utf8');
console.log('\n✅ AutomationFlow.jsx saved.');
