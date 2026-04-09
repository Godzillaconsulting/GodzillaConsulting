import React, { useState, useEffect } from 'react';
import { Mail, Edit3, Link as LinkIcon, Save, Plus, Trash2, Tag, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
const getToken = () => localStorage.getItem('adminToken');

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

export default function LeadMagnetsPanel() {
    const [magnets, setMagnets] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Editor UI State
    const [selectedId, setSelectedId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        slug: '',
        name: '',
        email_subject: '',
        email_body: '',
        file_url: ''
    });

    const fetchMagnets = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/lead-magnets`, { headers: authHeaders() });
            const data = await r.json();
            if (Array.isArray(data)) setMagnets(data);
        } catch (err) {
            console.error('Error fetching lead magnets', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMagnets();
    }, []);

    const handleSelect = (magnet) => {
        setIsCreating(false);
        setSelectedId(magnet.id);
        setFormData({
            slug: magnet.slug,
            name: magnet.name,
            email_subject: magnet.email_subject,
            email_body: magnet.email_body,
            file_url: magnet.file_url
        });
        setSaveStatus(null);
    };

    const handleCreateNew = () => {
        setSelectedId(null);
        setIsCreating(true);
        setFormData({
            slug: '',
            name: '',
            email_subject: '',
            email_body: '',
            file_url: ''
        });
        setSaveStatus(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus(null);
        try {
            const url = isCreating 
                ? `${API_BASE}/api/lead-magnets`
                : `${API_BASE}/api/lead-magnets/${selectedId}`;
            
            const method = isCreating ? 'POST' : 'PUT';
            
            const r = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(formData)
            });
            
            const data = await r.json();
            
            if (r.ok) {
                setSaveStatus({ success: true, message: 'Guardado correctamente' });
                await fetchMagnets();
                if (isCreating) {
                    setIsCreating(false);
                    setSelectedId(data.id); // switch to edit mode for the new item
                }
            } else {
                setSaveStatus({ success: false, message: data.error || 'Error al guardar' });
            }
        } catch (err) {
            setSaveStatus({ success: false, message: 'Error de red' });
        }
        setSaving(false);
    };

    return (
        <div className="flex flex-col h-full text-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 shrink-0 flex items-center justify-between bg-[#0d0d0d]">
                <div>
                    <h2 className="text-sm font-black text-white flex items-center gap-2">
                        <span>💌</span> Correos de Recursos (Lead Magnets)
                    </h2>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Controla el contenido de los correos automáticos cuando la gente descarga recursos.</p>
                </div>
            </div>

            {/* Layout de 2 columnas */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* ─ LISTA IZQUIERDA ─ */}
                <div className="w-[240px] border-r border-neutral-800 flex flex-col bg-[#0d0d0d] shrink-0">
                    <div className="p-3">
                        <button 
                            onClick={handleCreateNew}
                            className={`w-full py-2 flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition-all ${
                                isCreating 
                                ? 'bg-[#CC0000] text-white' 
                                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                            }`}
                        >
                            <Plus size={14} /> Nuevo Recurso
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading && <div className="p-4 text-center text-xs text-neutral-500"><Loader size={14} className="animate-spin inline mr-1"/> Cargando...</div>}
                        {!loading && magnets.length === 0 && <div className="p-4 text-center text-xs text-neutral-600">No hay correos listados</div>}
                        
                        {magnets.map(m => (
                            <button 
                                key={m.id}
                                onClick={() => handleSelect(m)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                                    selectedId === m.id && !isCreating
                                    ? 'bg-neutral-800 border-l-2 border-[#CC0000] text-white shadow-sm'
                                    : 'hover:bg-neutral-900 border-l-2 border-transparent text-neutral-400'
                                }`}
                            >
                                <p className="text-xs font-bold truncate">{m.name || m.slug}</p>
                                <p className="text-[10px] truncateopacity-50 flex items-center gap-1 mt-0.5">
                                    <Tag size={10} className="text-neutral-600"/> {m.slug}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─ DERECHA (EDITOR) ─ */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
                    {(!selectedId && !isCreating) ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-3">
                            <Mail size={40} className="opacity-20" />
                            <p className="text-sm font-bold">Selecciona un recurso de la izquierda para editar su correo</p>
                            <p className="text-xs">El slug que uses aquí debe ser el mismo que configuraste en tu código/frontend para que haga match.</p>
                        </div>
                    ) : (
                        <div className="max-w-2xl space-y-5">
                            
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                                <h3 className="text-lg font-black text-white">
                                    {isCreating ? 'Añadir Nuevo Correo' : 'Editando Correo'}
                                    <span className="text-[#CC0000] ml-2">[{formData.slug || 'slug-vacio'}]</span>
                                </h3>
                                
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formData.slug || !formData.email_subject || !formData.file_url || !(formData.email_body || '').trim()}
                                    className="px-5 py-2 flex items-center gap-2 bg-[#CC0000] hover:bg-red-600 text-white rounded-lg font-black text-xs transition shadow-[0_4px_15px_rgba(204,0,0,0.3)] disabled:opacity-40"
                                >
                                    {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                                    Guardar Cambios
                                </button>
                            </div>

                            {saveStatus && (
                                <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
                                    saveStatus.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                    {saveStatus.success ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                                    <p className="font-bold">{saveStatus.message}</p>
                                </div>
                            )}

                            {/* Fila: Nombre y Slug */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1"><Edit3 size={10}/> Nombre identificador</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => {
                                            const newName = e.target.value;
                                            setFormData(prev => ({
                                                ...prev, 
                                                name: newName,
                                                email_subject: (prev.email_subject === prev.name || !prev.email_subject) ? newName : prev.email_subject
                                            }));
                                        }}
                                        className="w-full p-2.5 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none"
                                        placeholder="Ej: Ebook IA 2026"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-yellow-600 uppercase flex items-center gap-1"><Tag size={10}/> Slug Estratégico (Importante)</label>
                                    <input 
                                        type="text" 
                                        value={formData.slug} 
                                        readOnly={!isCreating}
                                        onChange={e => setFormData({...formData, slug: e.target.value})}
                                        className={`w-full p-2.5 rounded-xl border text-sm outline-none transition-colors ${
                                            isCreating 
                                            ? 'bg-black border-yellow-700/50 text-yellow-100 focus:border-yellow-500' 
                                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed'
                                        }`}
                                        placeholder="ej: prompts-ia-marketing"
                                    />
                                    {isCreating && <p className="text-[9px] text-neutral-500">Debe coincidir EXACTAMENTE con el slug de Recursos.jsx ("prompts-ia-marketing", "boveda-scripts", etc)</p>}
                                </div>
                            </div>

                            {/* Asunto */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase">🎯 Asunto del Correo</label>
                                <input 
                                    type="text" 
                                    value={formData.email_subject} 
                                    onChange={e => setFormData({...formData, email_subject: e.target.value})}
                                    className="w-full p-2.5 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none"
                                    placeholder="Ej: Aquí tienes tu guía de marketing 🎁"
                                />
                                <p className="text-[10px] text-yellow-500 mt-1">⚠️ <strong>IMPORTANTE:</strong> El nombre del asunto debe ser exactamente igual al nombre del recurso descargable al que hace alusión la página en su momento. (Se jalará automáticamente según el "Nombre" arriba).</p>
                            </div>

                            {/* Cuerpo del correo */}
                            <div className="space-y-1.5 bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase flex justify-between">
                                    <span>📝 Mensaje</span>
                                    <span className="text-neutral-600">El botón de descarga se insertará abajo</span>
                                </label>
                                <textarea 
                                    rows={6}
                                    value={formData.email_body} 
                                    onChange={e => setFormData({...formData, email_body: e.target.value})}
                                    className="w-full p-3 mt-2 bg-black border border-neutral-700 rounded-xl text-white text-sm focus:border-[#CC0000] outline-none resize-none"
                                    placeholder="Hola, muchas gracias por confiar en Godzilla Consulting. A continuación encontrarás el material prometido..."
                                />
                            </div>

                            {/* Enlace de descarga */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#CC0000] uppercase flex items-center gap-1"><LinkIcon size={10}/> Link Archivo / PDF</label>
                                <input 
                                    type="url" 
                                    value={formData.file_url} 
                                    onChange={e => setFormData({...formData, file_url: e.target.value})}
                                    className="w-full p-2.5 bg-[#CC0000]/5 border border-[#CC0000]/30 rounded-xl text-red-100 text-sm focus:border-[#CC0000] outline-none"
                                    placeholder="https://godzillaconsulting.ai/lead-magnets/archivo.pdf"
                                />
                                <p className="text-[10px] text-neutral-500">Este es el link a donde llevará el botón ROJO central del correo.</p>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
