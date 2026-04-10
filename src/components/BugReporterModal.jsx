import React, { useState } from 'react';

const BugReporterModal = ({ x, y, onClose }) => {
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('media');
    const [screenshotBase64, setScreenshotBase64] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIMENSION = 1200;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compresión: Transforma a JPEG al 60% de calidad.
                // Destruye el error 502 por exceso de Payload de Vercel (< 500kb approx)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                setScreenshotBase64(compressedBase64);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            alert('Añade una descripción para el bug/sugerencia.');
            return;
        }
        setLoading(true);
        try {
            const API = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/bugs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description,
                    priority,
                    screenshot_url: screenshotBase64,
                    path_url: window.location.pathname
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP Error ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            if (data.success) {
                alert('✅ Bug/Sugerencia reportada a TI exitosamente.');
                onClose();
            } else {
                alert('Error al reportar: ' + data.error);
            }
        } catch (e) {
            alert('Error red: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Ajustar posiciones para que no se salga de la pantalla
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const modalW = 320;
    const modalH = 460;
    
    let top = y;
    let left = x;
    if (x + modalW > screenW) left = screenW - modalW - 20;
    if (y + modalH > screenH) top = screenH - modalH - 20;

    return (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose}></div>
            <div 
                className="fixed z-[9999] bg-[#0c0c0c] border border-neutral-800 rounded-2xl shadow-[0_0_50px_rgba(204,0,0,0.15)] overflow-hidden animate-fade-in text-white p-5 flex flex-col gap-4"
                style={{ top: `${top}px`, left: `${left}px`, width: `${modalW}px` }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()} // Aqui si permitir click derecho o no hacer nada
            >
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <h3 className="text-sm font-black text-red-500 uppercase flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
                        Reportar Bug IT
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white">&times;</button>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400 font-bold">Nivel de Prioridad:</label>
                    <select 
                        value={priority} onChange={e => setPriority(e.target.value)}
                        className="bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                        <option value="baja">Baja - (Sugerencia / Mejora Visual)</option>
                        <option value="media">Media - (Fallo leve, pero funcional)</option>
                        <option value="urgente">Urgente - (Rotura de sistema / Crítico)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400 font-bold">Descripción del Problema:</label>
                    <textarea 
                        value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Ej: El botón de generar avatar no reacciona al clic..."
                        className="bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500 h-24 resize-none"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400 font-bold">SS / Foto Evidencia (Opcional):</label>
                    <input 
                        type="file" accept="image/*" onChange={handleFileChange}
                        className="text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#222] file:text-white hover:file:bg-[#333]" 
                    />
                    {screenshotBase64 && (
                        <div className="mt-2 h-20 w-full overflow-hidden rounded-lg border border-neutral-800">
                            <img src={screenshotBase64} alt="Evidencia" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleSubmit} disabled={loading}
                    className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                >
                    {loading ? 'Enviando...' : 'Elevar Reporte'}
                </button>
            </div>
        </>
    );
}

export default BugReporterModal;
