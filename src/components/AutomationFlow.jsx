import React from 'react';
import { Bot, MessageCircle, Webhook, Zap, Calendar, ArrowRight, Server } from 'lucide-react';

const CurvedConnector = ({ startX, startY, endX, endY, color }) => {
    const midX = (startX + endX) / 2;
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    return (
        <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 0 }}>
            <path d={path} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" filter="blur(8px)" opacity="0.6"/>
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
};

export default function AutomationFlow() {
    return (
        <div className="w-full h-full bg-[#0a0a0a] bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] flex flex-col relative overflow-hidden font-sans">
            
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h2 className="text-xl font-black text-white drop-shadow-md flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-500"/> Flujo de Automatización
                    </h2>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Supervisión en tiempo real (Nodos Estilo n8n)</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        SISTEMA ACTIVO
                    </span>
                </div>
            </div>

            <div className="flex-1 relative w-full h-full p-10 lg:p-20 select-none overflow-auto">
                <div className="min-w-[1000px] min-h-[600px] relative">
                    <CurvedConnector startX={260} startY={220} endX={400} endY={220} color="#10b981" />
                    <CurvedConnector startX={620} startY={220} endX={750} endY={380} color="#3b82f6" />
                    <CurvedConnector startX={620} startY={220} endX={750} endY={120} color="#a855f7" />
                    
                    {/* NODO 1: Trigger */}
                    <div className="absolute top-[180px] left-[100px] w-[160px] bg-neutral-900 border border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-2xl p-4 flex flex-col items-center justify-center z-10 cursor-grab hover:bg-neutral-800 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <span className="text-white font-bold text-sm">WhatsApp</span>
                        <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1">Trigger Inicial</span>
                    </div>

                    {/* NODO 2: IA Agent */}
                    <div className="absolute top-[180px] left-[400px] w-[220px] bg-neutral-900 border-2 border-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-2xl p-5 flex items-center gap-4 z-10 cursor-grab hover:bg-neutral-800 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shrink-0">
                            <Bot className="w-7 h-7" />
                        </div>
                        <div>
                            <span className="text-white font-black text-lg block leading-none mb-1">AI Agent</span>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">En Ejecución</span>
                        </div>
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-900 border-2 border-[#10b981] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-ping"></div>
                        </div>
                    </div>

                    {/* NODO 3: Calendario */}
                    <div className="absolute top-[80px] left-[750px] w-[180px] bg-neutral-900 border border-[#a855f7] shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-2xl p-4 flex flex-col items-center justify-center z-10 cursor-grab hover:bg-neutral-800 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-white font-bold text-sm">Planificador IA</span>
                        <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1">Agendar Tarea</span>
                    </div>

                    {/* NODO 4: Base de Datos */}
                    <div className="absolute top-[340px] left-[750px] w-[180px] bg-neutral-900 border border-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-2xl p-4 flex flex-col items-center justify-center z-10 cursor-grab hover:bg-neutral-800 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                            <Server className="w-6 h-6" />
                        </div>
                        <span className="text-white font-bold text-sm">PostgreSQL</span>
                        <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1">Guardar Lead</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
