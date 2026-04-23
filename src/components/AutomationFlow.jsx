import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, MessageCircle, Webhook, Zap, Calendar, Server, Plus, Settings2, X, Trash2, Shield, Activity, Power } from 'lucide-react';

// Diccionario de iconos
const ICONS = { Bot, MessageCircle, Webhook, Calendar, Server, Shield, Activity };

const NODE_CONFIG = {
    trigger: { w: 160, h: 120 },
    agent:   { w: 220, h: 90 },
    action:  { w: 160, h: 120 },
};

const CurvedConnector = ({ startX, startY, endX, endY, color }) => {
    // Control points for a smooth bezier curve (horizontal flow)
    const midX = (startX + endX) / 2;
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    return (
        <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 0 }}>
            {/* Glow effect */}
            <path d={path} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" filter="blur(8px)" opacity="0.4"/>
            {/* Main line */}
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            {/* Animated data packet */}
            <circle r="4" fill="#fff" filter="blur(1px)">
                <animateMotion dur="3s" repeatCount="indefinite" path={path} />
            </circle>
        </svg>
    );
};

export default function AutomationFlow() {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [pm2Status, setPm2Status] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isDraggingNode, setIsDraggingNode] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    // Conexiones interactivas (Punteros)
    const [connectingFrom, setConnectingFrom] = useState(null);
    const [connectingToPos, setConnectingToPos] = useState(null);
    
    const canvasRef = useRef(null);

    // ─── Estructuras de Datos Eficientes (Punteros / Referencias en Memoria) ───
    const nodeMap = useMemo(() => {
        const map = new Map();
        nodes.forEach(n => map.set(n.id, n));
        return map;
    }, [nodes]);

    // ─── Carga Inicial y Sincronización en Vivo ─────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const loadFlow = async () => {
            try {
                const res = await fetch('/api/automation/flow', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setNodes(data.nodes || []);
                    setEdges(data.edges || []);
                }
            } catch (err) {
                console.error('Error cargando flow:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/automation/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setPm2Status(data.pm2 || []);
                }
            } catch (err) {}
        };

        loadFlow();
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // ─── Drag & Drop Handlers ───────────────────────────────────────────────────
    const handlePointerDown = (e, id) => {
        e.stopPropagation();
        if (e.target.dataset.port === 'out') {
            setConnectingFrom(id);
            setConnectingToPos({ x: e.clientX, y: e.clientY });
            return;
        }

        setSelectedNodeId(id);
        const el = document.getElementById(`node-${id}`);
        if(el && canvasRef.current) {
            const rect = el.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDraggingNode(id);
        }
    };

    const handlePointerMove = (e) => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newX = e.clientX - canvasRect.left + canvasRef.current.scrollLeft;
        const newY = e.clientY - canvasRect.top + canvasRef.current.scrollTop;

        if (connectingFrom) {
            setConnectingToPos({ x: newX, y: newY });
        } else if (isDraggingNode) {
            setNodes(prev => prev.map(n => n.id === isDraggingNode ? { ...n, x: newX - dragOffset.x, y: newY - dragOffset.y } : n));
        }
    };

    const handlePointerUp = (e) => {
        if (connectingFrom) {
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const targetNode = target?.closest('.node-container');
            if (targetNode) {
                const targetId = targetNode.getAttribute('data-id');
                if (targetId && targetId !== connectingFrom) {
                    const sourceNode = nodeMap.get(connectingFrom);
                    setEdges(prev => [...prev, {
                        id: `e${connectingFrom}-${targetId}-${Date.now()}`,
                        source: connectingFrom,
                        target: targetId,
                        color: sourceNode?.color || '#fff'
                    }]);
                }
            }
        }
        setIsDraggingNode(null);
        setConnectingFrom(null);
        setConnectingToPos(null);
    };

    // ─── Lógica de Nodos ─────────────────────────────────────────────────────────
    const handleAddNode = (type = 'action', title = 'Nuevo Nodo') => {
        const id = Date.now().toString();
        const viewX = canvasRef.current ? canvasRef.current.scrollLeft + 300 : 300;
        const viewY = canvasRef.current ? canvasRef.current.scrollTop + 200 : 200;

        setNodes([...nodes, {
            id, type, title, subtitle: 'Configurar', icon: 'Webhook', x: viewX, y: viewY, color: '#f59e0b', pm2_process: ''
        }]);
        setSelectedNodeId(id);
    };

    const handleDeleteNode = (id) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const updateSelectedNode = (updates) => {
        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
    };

    const saveFlow = async () => {
        const payload = { nodes, edges };
        try {
            const res = await fetch('/api/automation/flow', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert('Grafo guardado exitosamente en PostgreSQL. Conectado en vivo.');
            } else {
                alert('Error al guardar el grafo.');
            }
        } catch(err) {
            alert('Error de conexión con el backend.');
        }
    };

    const selectedNode = nodeMap.get(selectedNodeId);

    // ─── Renderizado de Nodos ────────────────────────────────────────────────────
    const renderNode = (node) => {
        const isSelected = selectedNodeId === node.id;
        const Icon = ICONS[node.icon] || Webhook;

        const pm2Data = pm2Status.find(p => p.name === node.pm2_process);
        const isOnline = pm2Data && pm2Data.status === 'online';

        // Estilos base compartidos
        const baseClass = `node-container absolute bg-neutral-900 shadow-lg rounded-2xl cursor-grab active:cursor-grabbing hover:bg-neutral-800 transition-colors z-10 ${isSelected ? 'border-2 border-white' : 'border border-neutral-800'}`;

        return (
            <div 
                id={`node-${node.id}`}
                data-id={node.id}
                key={node.id}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                className={`${baseClass} ${node.type === 'agent' ? 'w-[220px] p-5 flex items-center gap-4' : 'w-[160px] p-4 flex flex-col items-center justify-center'}`}
                style={{ left: node.x, top: node.y, borderColor: isSelected ? '#fff' : node.color, boxShadow: isSelected ? `0 0 20px ${node.color}55` : (node.type==='agent' ? `0 0 30px ${node.color}33` : 'none') }}
            >
                {/* Input Port (Left) */}
                <div 
                    data-port="in"
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-950 border-2 rounded-full cursor-crosshair flex items-center justify-center hover:scale-125 transition-transform"
                    style={{ borderColor: node.color }}
                >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                </div>

                {/* Output Port (Right) */}
                <div 
                    data-port="out"
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-950 border-2 rounded-full cursor-crosshair flex items-center justify-center hover:scale-125 transition-transform"
                    style={{ borderColor: node.color }}
                >
                    <div data-port="out" className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                </div>

                {node.type === 'agent' ? (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shrink-0 pointer-events-none">
                            <Icon className="w-7 h-7" />
                        </div>
                        <div className="pointer-events-none">
                            <span className="text-white font-black text-lg block leading-none mb-1">{node.title}</span>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{node.subtitle}</span>
                        </div>
                        {isOnline && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping" style={{backgroundColor: node.color}} />
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 pointer-events-none" style={{ backgroundColor: `${node.color}22`, color: node.color, boxShadow: `0 0 15px ${node.color}44` }}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-white font-bold text-sm text-center pointer-events-none">{node.title}</span>
                        <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1 text-center pointer-events-none">{node.subtitle}</span>
                    </>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-white font-black animate-pulse">Cargando Grafo...</div>;
    }

    return (
        <div 
            className="w-full h-full bg-[#0a0a0a] flex flex-col relative font-sans overflow-hidden"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Grid Background */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none">
                <div>
                    <h2 className="text-xl font-black text-white drop-shadow-md flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-500"/> Flujo de Automatización
                    </h2>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Supervisión en tiempo real (Nodos Estilo n8n)</p>
                </div>
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button onClick={() => saveFlow()} className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg uppercase tracking-widest">
                        Guardar Flujo
                    </button>
                    <button onClick={() => handleAddNode('action', 'Nuevo Action')} className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-white hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg">
                        <Plus className="w-4 h-4" /> Añadir Nodo
                    </button>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-900/30 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SISTEMA ACTIVO
                    </span>
                </div>
            </div>

            {/* Canvas Area */}
            <div 
                ref={canvasRef}
                className="flex-1 w-full h-full overflow-auto relative z-10"
                onClick={(e) => { if (e.target === canvasRef.current) setSelectedNodeId(null); }}
            >
                <div className="min-w-[2000px] min-h-[1500px] relative">
                    
                    {/* Render Active Dragging Edge */}
                    {connectingFrom && connectingToPos && (() => {
                        const sourceNode = nodeMap.get(connectingFrom);
                        if (!sourceNode) return null;
                        const sDim = NODE_CONFIG[sourceNode.type] || { w: 160, h: 120 };
                        const startX = sourceNode.x + sDim.w;
                        const startY = sourceNode.y + (sDim.h / 2);
                        return <CurvedConnector startX={startX} startY={startY} endX={connectingToPos.x} endY={connectingToPos.y} color={sourceNode.color || '#fff'} />;
                    })()}

                    {/* Render Edges */}
                    {edges.map(edge => {
                        const source = nodeMap.get(edge.source);
                        const target = nodeMap.get(edge.target);
                        if (!source || !target) return null;

                        const sDim = NODE_CONFIG[source.type] || { w: 160, h: 120 };
                        const tDim = NODE_CONFIG[target.type] || { w: 160, h: 120 };

                        // Conectar desde la derecha del origen a la izquierda del destino
                        const startX = source.x + sDim.w;
                        const startY = source.y + (sDim.h / 2);
                        const endX = target.x;
                        const endY = target.y + (tDim.h / 2);

                        return <CurvedConnector key={edge.id} startX={startX} startY={startY} endX={endX} endY={endY} color={edge.color || target.color} />;
                    })}

                    {/* Render Nodes */}
                    {nodes.map(renderNode)}
                </div>
            </div>

            {/* Panel de Configuración Lateral */}
            <div className={`absolute right-0 top-0 bottom-0 w-80 bg-neutral-950 border-l border-neutral-800 shadow-2xl z-30 transform transition-transform duration-300 flex flex-col ${selectedNodeId ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedNode && (
                    <>
                        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-black">
                            <h3 className="text-white font-black flex items-center gap-2"><Settings2 className="w-5 h-5 text-neutral-400"/> Configuración</h3>
                            <button onClick={() => setSelectedNodeId(null)} className="text-neutral-500 hover:text-white p-1 bg-neutral-900 rounded"><X className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="p-5 flex-1 overflow-y-auto space-y-6">
                            <div className="flex items-center gap-3 mb-6 bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                                <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: `${selectedNode.color}22`, color: selectedNode.color }}>
                                    {React.createElement(ICONS[selectedNode.icon] || Webhook, { className: 'w-5 h-5' })}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{selectedNode.title}</p>
                                    <p className="text-[10px] text-neutral-500 uppercase font-mono">ID: {selectedNode.id}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Título del Nodo</label>
                                    <input 
                                        type="text" 
                                        value={selectedNode.title} 
                                        onChange={e => updateSelectedNode({title: e.target.value})}
                                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Subtítulo / Estado</label>
                                    <input 
                                        type="text" 
                                        value={selectedNode.subtitle} 
                                        onChange={e => updateSelectedNode({subtitle: e.target.value})}
                                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Color del Acento</label>
                                    <div className="flex gap-2">
                                        {['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#64748b'].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => updateSelectedNode({color: c})}
                                                className={`w-6 h-6 rounded-full border-2 ${selectedNode.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                                style={{backgroundColor: c}}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">PM2 Process Name (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={selectedNode.pm2_process || ''} 
                                        onChange={e => updateSelectedNode({pm2_process: e.target.value})}
                                        placeholder="ej. zilla-whatsapp"
                                        className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white transition-colors"
                                    />
                                    <p className="text-[9px] text-neutral-500">Si coincide con PM2, mostrará estatus en vivo.</p>
                                </div>
                            </div>
                            
                            <hr className="border-neutral-800"/>
                            
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2"><Power className="w-3 h-3"/> Estado del Motor (PM2)</h4>
                                {selectedNode.pm2_process ? (
                                    (() => {
                                        const pData = pm2Status.find(p => p.name === selectedNode.pm2_process);
                                        if (pData) {
                                            return (
                                                <>
                                                    <p className="text-[10px] text-emerald-400 font-bold mb-1">🟢 ONLINE - Mem: {Math.round(pData.memory / 1024 / 1024)}MB | CPU: {pData.cpu}%</p>
                                                    <button className="w-full mt-2 py-2 bg-black border border-neutral-700 hover:border-neutral-500 text-xs font-bold text-white rounded-lg transition-colors">Reiniciar Proceso</button>
                                                </>
                                            );
                                        } else {
                                            return <p className="text-[10px] text-rose-500 font-bold">🔴 OFFLINE o No Encontrado</p>;
                                        }
                                    })()
                                ) : (
                                    <p className="text-[10px] text-neutral-500">No vinculado a PM2.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-neutral-800 bg-black">
                            <button 
                                onClick={() => handleDeleteNode(selectedNode.id)}
                                className="w-full py-3 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar Nodo
                            </button>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
