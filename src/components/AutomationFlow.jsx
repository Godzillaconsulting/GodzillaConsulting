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
    const [nodes, setNodes] = useState([
        { id: '1', type: 'trigger', title: 'WhatsApp', subtitle: 'Trigger Inicial', icon: 'MessageCircle', x: 100, y: 220, color: '#10b981' },
        { id: '2', type: 'agent', title: 'AI Agent', subtitle: 'En Ejecución', icon: 'Bot', x: 400, y: 235, color: '#10b981', pulse: true },
        { id: '3', type: 'action', title: 'Planificador IA', subtitle: 'Agendar Tarea', icon: 'Calendar', x: 750, y: 80, color: '#a855f7' },
        { id: '4', type: 'action', title: 'PostgreSQL', subtitle: 'Guardar Lead', icon: 'Server', x: 750, y: 340, color: '#3b82f6' }
    ]);
    const [edges, setEdges] = useState([
        { id: 'e1-2', source: '1', target: '2', color: '#10b981' },
        { id: 'e2-3', source: '2', target: '3', color: '#a855f7' },
        { id: 'e2-4', source: '2', target: '4', color: '#3b82f6' }
    ]);
    
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isDraggingNode, setIsDraggingNode] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // ─── Drag & Drop Handlers ───────────────────────────────────────────────────
    const handlePointerDown = (e, id) => {
        e.stopPropagation();
        setSelectedNodeId(id);
        const el = document.getElementById(`node-${id}`);
        if(el && canvasRef.current) {
            const rect = el.getBoundingClientRect();
            // Calcular el offset interno de donde se hizo click dentro del nodo
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDraggingNode(id);
        }
    };

    const handlePointerMove = (e) => {
        if (!isDraggingNode || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        // Calcular nueva posición relativa al contenedor con scroll
        const newX = e.clientX - canvasRect.left - dragOffset.x + canvasRef.current.scrollLeft;
        const newY = e.clientY - canvasRect.top - dragOffset.y + canvasRef.current.scrollTop;
        
        setNodes(prev => prev.map(n => n.id === isDraggingNode ? { ...n, x: newX, y: newY } : n));
    };

    const handlePointerUp = () => {
        setIsDraggingNode(null);
    };

    // ─── Lógica de Nodos ─────────────────────────────────────────────────────────
    const handleAddNode = () => {
        const id = Date.now().toString();
        // Colocarlo en un punto visible
        const viewX = canvasRef.current ? canvasRef.current.scrollLeft + 300 : 300;
        const viewY = canvasRef.current ? canvasRef.current.scrollTop + 200 : 200;

        setNodes([...nodes, {
            id, type: 'action', title: 'Nuevo Nodo', subtitle: 'Configurar', icon: 'Webhook', x: viewX, y: viewY, color: '#f59e0b'
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

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

    // ─── Renderizado de Nodos ────────────────────────────────────────────────────
    const renderNode = (node) => {
        const isSelected = selectedNodeId === node.id;
        const Icon = ICONS[node.icon] || Webhook;

        if (node.type === 'agent') {
            return (
                <div 
                    id={`node-${node.id}`}
                    key={node.id}
                    onPointerDown={(e) => handlePointerDown(e, node.id)}
                    className={`absolute w-[220px] bg-neutral-900 border-2 shadow-[0_0_30px_rgba(16,185,129,0.2)] rounded-2xl p-5 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:bg-neutral-800 transition-colors z-10`}
                    style={{ left: node.x, top: node.y, borderColor: isSelected ? '#fff' : node.color }}
                >
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shrink-0">
                        <Icon className="w-7 h-7" />
                    </div>
                    <div>
                        <span className="text-white font-black text-lg block leading-none mb-1">{node.title}</span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{node.subtitle}</span>
                    </div>
                    {node.pulse && (
                        <div className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-900 border-2 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]`} style={{borderColor: node.color}}>
                            <div className="w-2 h-2 rounded-full animate-ping" style={{backgroundColor: node.color}}></div>
                        </div>
                    )}
                </div>
            );
        }

        // Trigger y Action styles (cuadrados con icono arriba)
        return (
            <div 
                id={`node-${node.id}`}
                key={node.id}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                className={`absolute w-[160px] bg-neutral-900 border shadow-lg rounded-2xl p-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-neutral-800 transition-colors z-10`}
                style={{ left: node.x, top: node.y, borderColor: isSelected ? '#fff' : node.color, boxShadow: isSelected ? `0 0 20px ${node.color}55` : 'none' }}
            >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${node.color}22`, color: node.color, boxShadow: `0 0 15px ${node.color}44` }}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-white font-bold text-sm text-center">{node.title}</span>
                <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1 text-center">{node.subtitle}</span>
            </div>
        );
    };

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
                    <button onClick={handleAddNode} className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-white hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg">
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
                    
                    {/* Render Edges */}
                    {edges.map(edge => {
                        const source = nodes.find(n => n.id === edge.source);
                        const target = nodes.find(n => n.id === edge.target);
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
                            </div>
                            
                            <hr className="border-neutral-800"/>
                            
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2"><Power className="w-3 h-3"/> Estado del Motor</h4>
                                <p className="text-[10px] text-neutral-400 leading-relaxed mb-3">Este nodo está actualmente activo en el gestor PM2. Se está monitoreando en tiempo real.</p>
                                <button className="w-full py-2 bg-black border border-neutral-700 hover:border-neutral-500 text-xs font-bold text-white rounded-lg transition-colors">Reiniciar Proceso</button>
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
