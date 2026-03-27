import React, { useState } from 'react';
import { Mail, Edit3, Link as LinkIcon, Send, Clock, User, CheckCircle, GripVertical } from 'lucide-react';


export default function CorreosInbox({ draftData, change }) {
    const [selectedIdx, setSelectedIdx] = useState(1);

    // Get max recursos
    let maxRecurso = 0;
    Object.keys(draftData).forEach(k => {
        if(k.startsWith('recurso') && k.endsWith('Nombre')) {
            const num = parseInt(k.replace('recurso', '').replace('Nombre', '')) || 0;
            if (num > maxRecurso) maxRecurso = num;
        }
    });

    const recursos = Array.from({length: maxRecurso}, (_, i) => i + 1).filter(idx => draftData[`recurso${idx}Nombre`] !== undefined);

    if (recursos.length === 0) {
        return <p className="text-neutral-500 text-sm">No hay recursos configurados.</p>;
    }

    // Default Templates
    const defaultTemplates = {};

    const activeData = {
        name: draftData[`recurso${selectedIdx}Nombre`],
        subject: draftData[`recurso${selectedIdx}EmailSubject`] || defaultTemplates[selectedIdx]?.subject || '',
        body: draftData[`recurso${selectedIdx}EmailBody`] || defaultTemplates[selectedIdx]?.body || '',
        url: draftData[`recurso${selectedIdx}FileUrl`] || defaultTemplates[selectedIdx]?.url || ''
    };

    return (
        <div className="flex h-[600px] border border-neutral-800 rounded-xl overflow-hidden bg-[#0d0d0d]">
            
            {/* ─ INBOX SIDEBAR ─ */}
            <div className="w-[35%] bg-[#0a0a0a] border-r border-neutral-800 flex flex-col">
                <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Mail size={16} className="text-[#CC0000]"/> Bandeja de Salida
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-1">Correos automáticos de recursos</p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {recursos.map(idx => (
                        <button 
                            key={idx}
                            onClick={() => setSelectedIdx(idx)}
                            className={`w-full text-left p-4 border-b border-neutral-800 transition-all ${
                                selectedIdx === idx 
                                ? 'bg-[#CC0000]/10 border-l-2 border-l-[#CC0000]' 
                                : 'hover:bg-neutral-900 border-l-2 border-l-transparent'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold ${selectedIdx === idx ? 'text-[#CC0000]' : 'text-neutral-500'}`}>
                                    Recurso {idx}
                                </span>
                                <span className="text-[9px] text-neutral-600">Automático</span>
                            </div>
                            <p className="text-xs font-bold text-white truncate">
                                {draftData[`recurso${idx}EmailSubject`] || defaultTemplates[idx]?.subject || `Correo para ${draftData[`recurso${idx}Nombre`]}`}
                            </p>
                            <p className="text-[10px] text-neutral-500 truncate mt-1">
                                {draftData[`recurso${idx}EmailBody`] ? "Personalizado..." : "Plantilla activada..."}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* ─ EDITOR INBOX (DERECHA) ─ */}
            <div className="w-[65%] flex flex-col bg-white">
                
                {/* Header estilo correo corporativo */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {activeData.subject || "Sin Asunto"}
                        </h2>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><User size={12}/> De: Godzilla Consulting (Automático)</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock size={12}/> Se enviará al descargar</span>
                        </div>
                    </div>
                    <div className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-[10px] flex items-center gap-1">
                        <CheckCircle size={12}/> Activo
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white space-y-5">
                    
                    {/* Campos editables simulando el cuerpo del correo */}
                    <div className="space-y-4">
                        
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Asunto del Correo</label>
                            <input 
                                type="text"
                                value={activeData.subject}
                                onChange={e => change(`recurso${selectedIdx}EmailSubject`, e.target.value)}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none shadow-sm transition"
                                placeholder="Ej: Tu acceso inmediato"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cuerpo del Mensaje</label>
                            <textarea 
                                rows={8}
                                value={activeData.body}
                                onChange={e => change(`recurso${selectedIdx}EmailBody`, e.target.value)}
                                className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] outline-none resize-none shadow-sm leading-relaxed"
                                placeholder="Hola,\nGracias por..."
                            />
                        </div>

                        {/* Falso "Botón" en la UI de bandeja */}
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col items-center justify-center space-y-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full text-center">Botón de Descarga que verá el usuario</label>
                            
                            <div className="relative group w-full max-w-sm">
                                <span className="absolute -top-2 -left-2 bg-black text-white text-[9px] px-2 py-0.5 rounded shadow z-10 font-bold">Botón Rojo del PDF</span>
                                <input 
                                    type="text"
                                    value={activeData.url}
                                    onChange={e => change(`recurso${selectedIdx}FileUrl`, e.target.value)}
                                    className="w-full pl-9 pr-3 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 text-xs focus:border-[#CC0000] outline-none shadow-sm text-center font-mono"
                                    placeholder="https://"
                                />
                                <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            <p className="text-[10px] text-gray-500 text-center max-w-xs">
                                Pega aquí el link de tu Google Drive, AWS S3 o Dropbox donde alojas el PDF real.
                            </p>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
