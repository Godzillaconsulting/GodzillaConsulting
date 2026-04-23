import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, MessageCircle, Webhook, Zap, Calendar, Server, Plus, Settings2, X, Trash2, Shield, Activity, Power, Smartphone, Video, Camera, Database, Mail, Wand2, CheckSquare, Image, Play, Clock, CheckCircle, XCircle } from 'lucide-react';

// Diccionario de iconos
const ICONS = { Bot, MessageCircle, Webhook, Calendar, Server, Shield, Activity, Smartphone, Video, Camera, Database, Mail, Wand2, CheckSquare, Image, Play };

const NODE_CONFIG = {
    trigger: { w: 160, h: 120 },
    agent:   { w: 220, h: 90 },
    action:  { w: 160, h: 120 },
};

const FLOW_TEMPLATES = [
    {
        name: "🌱 Flujo Básico",
        description: "Planificador IA ➔ Tarea de Studio",
        nodes: [
            { id: "t1", type: "trigger", title: "Planificador IA", subtitle: "Generador (Origen)", icon: "Wand2", x: 200, y: 200, color: "#a855f7", pm2_process: "" },
            { id: "t2", type: "action", title: "Tarea de Studio", subtitle: "CEO Estudio Sync", icon: "CheckSquare", x: 550, y: 200, color: "#10b981", pm2_process: "" }
        ],
        edges: [ { id: "e1", source: "t1", target: "t2", color: "#a855f7" } ]
    },
    {
        name: "🚀 Máquina de Producción UGC",
        description: "Planificador ➔ Imagen ➔ Video ➔ Tarea",
        nodes: [
            { id: "t1", type: "trigger", title: "Planificador IA", subtitle: "Generador (Origen)", icon: "Wand2", x: 100, y: 200, color: "#a855f7", pm2_process: "" },
            { id: "t2", type: "action", title: "Generador Visual", subtitle: "Imagen 3 API", icon: "Image", x: 400, y: 100, color: "#3b82f6", pm2_process: "" },
            { id: "t3", type: "action", title: "Generador Video", subtitle: "Veo / Kling", icon: "Video", x: 400, y: 300, color: "#f59e0b", pm2_process: "" },
            { id: "t4", type: "action", title: "Tarea de Studio", subtitle: "CEO Estudio Sync", icon: "CheckSquare", x: 750, y: 200, color: "#10b981", pm2_process: "" }
        ],
        edges: [
            { id: "e1", source: "t1", target: "t2", color: "#a855f7" },
            { id: "e2", source: "t1", target: "t3", color: "#a855f7" },
            { id: "e3", source: "t2", target: "t4", color: "#3b82f6" },
            { id: "e4", source: "t3", target: "t4", color: "#f59e0b" }
        ]
    },
    {
        name: "📱 Bot de Alertas Omnicanal",
        description: "Notifica por Email y WhatsApp tras asignar la tarea",
        nodes: [
            { id: "t1", type: "trigger", title: "Planificador IA", subtitle: "Generador (Origen)", icon: "Wand2", x: 100, y: 200, color: "#a855f7", pm2_process: "" },
            { id: "t2", type: "action", title: "Tarea de Studio", subtitle: "CEO Estudio Sync", icon: "CheckSquare", x: 400, y: 200, color: "#10b981", pm2_process: "" },
            { id: "t3", type: "action", title: "Email Worker", subtitle: "Notificación Equipo", icon: "Mail", x: 700, y: 100, color: "#f97316", pm2_process: "email-worker" },
            { id: "t4", type: "action", title: "WhatsApp Bot", subtitle: "Alerta WA", icon: "Smartphone", x: 700, y: 300, color: "#10b981", pm2_process: "whatsapp-bot" }
        ],
        edges: [
            { id: "e1", source: "t1", target: "t2", color: "#a855f7" },
            { id: "e2", source: "t2", target: "t3", color: "#10b981" },
            { id: "e3", source: "t2", target: "t4", color: "#10b981" }
        ]
    }
];

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
    
    const [showNodeMenu, setShowNodeMenu] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // ─── Estado del Motor de Ejecución ─────────────────────────────────────────
    const [isExecuting, setIsExecuting] = useState(false);
    const [runHistory, setRunHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [executingNodes, setExecutingNodes] = useState(new Set());
    
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

        const fetchRunHistory = async () => {
            try {
                const res = await fetch('/api/automation/runs', { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) setRunHistory(data.runs || []);
            } catch (err) {}
        };

        loadFlow();
        fetchStatus();
        fetchRunHistory();
        const interval = setInterval(fetchStatus, 5000);
        const histInterval = setInterval(fetchRunHistory, 10000);
        return () => { clearInterval(interval); clearInterval(histInterval); };
    }, []);

    // ─── Ejecutar Flujo (Botón ▶) ──────────────────────────────────────────────
    const executeFlow = async () => {
        const sourceNode = nodes.find(n => n.title === 'Planificador IA');
        if (!sourceNode) {
            alert('Añade un nodo "Planificador IA" y conéctalo a otros nodos antes de ejecutar.');
            return;
        }
        const token = localStorage.getItem('adminToken');
        setIsExecuting(true);
        setExecutingNodes(new Set(nodes.map(n => n.id)));
        try {
            await fetch('/api/automation/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sourceTitle: 'Planificador IA', payload: {} })
            });
            // Refrescar historial después de 4 segundos para capturar el resultado
            setTimeout(async () => {
                const runsRes = await fetch('/api/automation/runs', { headers: { 'Authorization': `Bearer ${token}` } });
                const runsData = await runsRes.json();
                if (runsData.success) { setRunHistory(runsData.runs || []); setShowHistory(true); }
            }, 4000);
        } catch (err) {
            console.error('Error ejecutando flujo:', err);
        } finally {
            setTimeout(() => { setIsExecuting(false); setExecutingNodes(new Set()); }, 4000);
        }
    };



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
    const handleAddNode = (type = 'action', title = 'Nuevo Nodo', icon = 'Webhook', pm2 = '', url = '') => {
        const id = Date.now().toString();
        const viewX = canvasRef.current ? canvasRef.current.scrollLeft + 300 : 300;
        const viewY = canvasRef.current ? canvasRef.current.scrollTop + 200 : 200;

        setNodes([...nodes, {
            id, type, title, subtitle: 'Configurar', icon, x: viewX + (Math.random() * 50), y: viewY + (Math.random() * 50), color: '#f59e0b', pm2_process: pm2, webhook_url: url
        }]);
        setSelectedNodeId(id);
    };

    const handleAddPresetNode = (preset) => {
        const id = Date.now().toString();
        const viewX = canvasRef.current ? canvasRef.current.scrollLeft + 300 : 300;
        const viewY = canvasRef.current ? canvasRef.current.scrollTop + 200 : 200;

        setNodes([...nodes, {
            id, 
            type: preset.title === 'Planificador IA' ? 'trigger' : 'action', 
            title: preset.title, 
            subtitle: preset.subtitle, 
            icon: preset.icon, 
            x: viewX + (Math.random() * 50), 
            y: viewY + (Math.random() * 50), 
            color: preset.color, 
            pm2_process: preset.pm2_process 
        }]);
        setSelectedNodeId(id);
        setShowNodeMenu(false);
    };

    const handleLoadTemplate = (template) => {
        if(nodes.length > 0) {
            const ok = window.confirm("Cargar una plantilla reemplazará todos los nodos actuales. ¿Continuar?");
            if(!ok) return;
        }
        // Asignar IDs nuevos a los nodos de la plantilla para evitar colisiones si se cargan dos veces (aunque se reemplaza, es buena práctica)
        const idMap = {};
        const newNodes = template.nodes.map(n => {
            const newId = `node_${Math.random().toString(36).substr(2, 9)}`;
            idMap[n.id] = newId;
            return { ...n, id: newId };
        });
        const newEdges = template.edges.map(e => ({
            ...e,
            id: `edge_${Math.random().toString(36).substr(2, 9)}`,
            source: idMap[e.source],
            target: idMap[e.target]
        }));
        
        setNodes(newNodes);
        setEdges(newEdges);
        setSelectedNodeId(null);
        setShowTemplateMenu(false);
    };
    const handleRestartProcess = async (processName) => {
        if(!processName) return;
        try {
            const res = await fetch('/api/automation/restart', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ processName })
            });
            const data = await res.json();
            if(data.success) {
                alert(`Proceso ${processName} reiniciado con éxito.`);
            } else {
                alert(`Error al reiniciar: ${data.error}`);
            }
        } catch(e) {
            alert('Error de red al intentar reiniciar proceso.');
        }
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
                    <button 
                        onClick={executeFlow}
                        disabled={isExecuting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg uppercase tracking-widest ${
                            isExecuting 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-wait animate-pulse' 
                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                        }`}
                    >
                        <Play className="w-4 h-4" />
                        {isExecuting ? 'Ejecutando...' : 'Ejecutar Flujo'}
                    </button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-400 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                        <Clock className="w-4 h-4" />
                        {runHistory.length > 0 && (
                            <span className={`w-2 h-2 rounded-full ${runHistory[0]?.status === 'success' ? 'bg-emerald-400' : runHistory[0]?.status === 'error' ? 'bg-rose-400' : 'bg-yellow-400'}`} />
                        )}
                    </button>
                    <div className="relative">
                        <button onClick={() => {setShowTemplateMenu(!showTemplateMenu); setShowNodeMenu(false);}} className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/50 text-purple-300 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <Wand2 className="w-4 h-4" /> Plantillas
                        </button>
                        
                        {showTemplateMenu && (
                            <div className="absolute top-full mt-2 right-0 w-72 bg-neutral-950 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50">
                                <div className="p-2 border-b border-neutral-800 bg-neutral-900">
                                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold px-2">Plantillas Rápidas</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1">
                                    {FLOW_TEMPLATES.map((template, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleLoadTemplate(template)}
                                            className="w-full text-left p-3 hover:bg-neutral-800 rounded flex flex-col gap-1 transition-colors group border-b border-neutral-800/50 last:border-0"
                                        >
                                            <p className="text-xs text-purple-300 font-bold group-hover:text-purple-200 transition-colors flex items-center gap-2">
                                                {template.name}
                                            </p>
                                            <p className="text-[10px] text-neutral-500 leading-tight">{template.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button onClick={() => {setShowNodeMenu(!showNodeMenu); setShowTemplateMenu(false);}} className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-white hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg">
                            <Plus className="w-4 h-4" /> Añadir Nodo
                        </button>
                        
                        {showNodeMenu && (
                            <div className="absolute top-full mt-2 right-0 w-64 bg-neutral-950 border border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50">
                                <div className="p-2 border-b border-neutral-800 bg-neutral-900">
                                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold px-2">Catálogo de Pilares</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1">
                                    {[
                                        { title: 'Planificador IA', subtitle: 'Generador (Origen)', icon: 'Wand2', color: '#a855f7', pm2_process: '' },
                                        { title: 'Generador Visual', subtitle: 'Imagen 3 API', icon: 'Image', color: '#3b82f6', pm2_process: '' },
                                        { title: 'Generador Video', subtitle: 'Veo / Kling', icon: 'Video', color: '#f59e0b', pm2_process: '' },
                                        { title: 'Tarea de Studio', subtitle: 'CEO Estudio Sync', icon: 'CheckSquare', color: '#10b981', pm2_process: '' },
                                        { title: 'Email Worker', subtitle: 'Notificación Equipo', icon: 'Mail', color: '#f97316', pm2_process: 'email-worker' },
                                        { title: 'WhatsApp Bot', subtitle: 'Alerta WA', icon: 'Smartphone', color: '#10b981', pm2_process: 'whatsapp-bot' },
                                        { title: 'Base de Datos', subtitle: 'Persistencia DB', icon: 'Database', color: '#64748b', pm2_process: '' }

                                    ].map((preset, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleAddPresetNode(preset)}
                                            className="w-full text-left p-2 hover:bg-neutral-800 rounded flex items-center gap-3 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{backgroundColor: `${preset.color}22`, color: preset.color}}>
                                                {React.createElement(ICONS[preset.icon] || Webhook, { className: 'w-4 h-4' })}
                                            </div>
                                            <div>
                                                <p className="text-xs text-white font-bold group-hover:text-white transition-colors">{preset.title}</p>
                                                <p className="text-[10px] text-neutral-500">{preset.pm2_process ? `PM2: ${preset.pm2_process}` : 'Sin proceso'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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
                                    <p className="text-[9px] text-neutral-500">Vincula el nodo a tu bot interno en PM2.</p>
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
                                                    <button onClick={() => handleRestartProcess(selectedNode.pm2_process)} className="w-full mt-2 py-2 bg-black border border-neutral-700 hover:border-neutral-500 text-xs font-bold text-white rounded-lg transition-colors">Reiniciar Proceso</button>
                                                </>
                                            );
                                        } else {
                                            return <p className="text-[10px] text-rose-500 font-bold">🔴 OFFLINE o No Encontrado</p>;
                                        }
                                    })()
                                ) : (
                                    <>
                                        <p className="text-[10px] text-emerald-400 font-bold mb-1">🟢 ONLINE - Integración Nativa</p>
                                        <p className="text-[9px] text-emerald-500/60 leading-tight">Este nodo se ejecuta directamente dentro del núcleo de Godzilla Server sin requerir un microservicio externo.</p>
                                    </>
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

            {/* Panel de Historial de Ejecuciones */}
            {showHistory && (
                <div className="absolute bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 z-30 shadow-2xl">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-400"/> Historial de Ejecuciones
                        </h3>
                        <button onClick={() => setShowHistory(false)} className="text-neutral-500 hover:text-white">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="flex gap-3 p-4 overflow-x-auto">
                        {runHistory.length === 0 ? (
                            <p className="text-xs text-neutral-500 py-2">Sin ejecuciones previas. Presiona "Ejecutar Flujo" para comenzar.</p>
                        ) : runHistory.map(run => (
                            <div key={run.id} className={`shrink-0 bg-black border rounded-xl p-3 w-52 ${run.status === 'success' ? 'border-emerald-500/30' : run.status === 'error' ? 'border-rose-500/30' : 'border-yellow-500/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {run.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400"/> : run.status === 'error' ? <XCircle className="w-4 h-4 text-rose-400"/> : <Clock className="w-4 h-4 text-yellow-400 animate-spin"/>}
                                    <span className={`text-[10px] font-black uppercase ${run.status === 'success' ? 'text-emerald-400' : run.status === 'error' ? 'text-rose-400' : 'text-yellow-400'}`}>{run.status}</span>
                                    <span className="text-[9px] text-neutral-600 ml-auto">{run.duration_ms ? `${(run.duration_ms/1000).toFixed(1)}s` : '—'}</span>
                                </div>
                                <p className="text-[10px] text-white font-bold mb-1 truncate">{run.source}</p>
                                <p className="text-[9px] text-neutral-500">{new Date(run.started_at).toLocaleString('es-MX', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                {run.log && Array.isArray(run.log) && (
                                    <div className="mt-2 space-y-0.5">
                                        {run.log.map((step, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`}/>
                                                <span className="text-[9px] text-neutral-400 truncate">{step.node}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
