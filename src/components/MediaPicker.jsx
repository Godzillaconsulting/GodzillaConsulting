import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const API = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
export const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * MediaPicker — Componente para subir y seleccionar imágenes/videos.
 * En producción usa Vercel Blob Store (/api/blob); en dev usa /api/media local.
 */
export default function MediaPicker({ value, onChange, accept = 'all', label = '', compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState('library'); // 'library' | 'upload' | 'url'
    const [media, setMedia] = useState({ images: [], videos: [] });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [urlInput, setUrlInput] = useState('');
    const [filter, setFilter] = useState('all');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) fetchMedia();
    }, [isOpen]);

    const fetchMedia = async () => {
        try {
            const r = await fetch(`${API}/api/media`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            const d = await r.json();
            setMedia(d);
        } catch (e) {
            console.error('Error cargando media:', e);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setUploading(true);
        setUploadProgress(0);

        const isVideoFile = file.type.startsWith('video/');
        const endpoint = isVideoFile ? `${API}/api/media/upload-video` : `${API}/api/media/upload`;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable) {
                    setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                }
            };
            xhr.onload = async () => {
                try {
                    if (xhr.status >= 400) {
                        const errorMsg = `HTTP ${xhr.status}: ${xhr.statusText}`;
                        alert(`❌ Fallo de servidor/red. ${errorMsg}\n\nSi es un video grande y ves "413", Cloudflare está bloqueando el peso máximo permitido (100MB). Verifica el peso del archivo.`);
                        throw new Error(errorMsg);
                    }
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        await fetchMedia();
                        onChange(result.url);
                        setIsOpen(false);
                    } else {
                        alert(result.error || 'Error interno al procesar subida: ' + JSON.stringify(result));
                    }
                } catch (err) {
                    console.error('Upload error:', err);
                    if(err.message.includes("413")) return;
                    alert('Error en el formato de transferencia. Es posible que el archivo exceda los limites o sea bloqueado por el firewall.');
                } finally {
                    setUploading(false);
                    setUploadProgress(0);
                }
            };
            xhr.onerror = () => { setUploading(false); alert('Error de red al subir archivo.'); };
            xhr.open('POST', endpoint);
            xhr.send(formData);
        } catch (err) {
            console.error('Upload catch error:', err);
            setUploading(false);
            alert('Error al iniciar la subida.');
        }
    };

    const filteredMedia = () => {
        let items = [];
        if (accept === 'all') {
            items = [
                ...media.images.map(i => ({ ...i, type: 'images' })),
                ...media.videos.map(v => ({ ...v, type: 'videos' })),
                ...(media.documents || []).map(d => ({ ...d, type: 'document' }))
            ];
        } else if (accept === 'video') {
            items = media.videos.map(v => ({ ...v, type: 'videos' }));
        } else if (accept === 'image') {
            items = media.images.map(i => ({ ...i, type: 'images' }));
        } else if (accept === 'document') {
            items = (media.documents || []).map(d => ({ ...d, type: 'document' }));
        }

        if (filter === 'images') {
            items = items.filter(i => i.type === 'images');
        } else if (filter === 'videos') {
            items = items.filter(i => i.type === 'videos');
        } else if (filter === 'docs') {
            items = items.filter(i => i.type === 'document');
        }

        return items;
    };

    const handleDelete = async (type, filename, e, url) => {
        e.stopPropagation();
        if (!confirm(`⚠️ ALERTA: ¿Seguro que quieres eliminar permanentemente ${filename} de la base de datos? Esto no se puede deshacer.`)) return;
        
        const token = localStorage.getItem('adminToken');
        await fetch(`${API}/api/media/${type}/${filename}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchMedia();
    };

    const handleSelectUrl = () => {
        if (urlInput.trim()) {
            onChange(urlInput.trim());
            setIsOpen(false);
            setUrlInput('');
        }
    };

    const isVideo = (item) => item.type === 'videos';

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-1">
            {label && <label className="text-[11px] font-semibold text-gray-400 block">{label}</label>}

            {/* Preview del valor actual */}
            <div className="flex items-center gap-2">
                <div
                    className={`relative shrink-0 ${compact ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-full max-w-[200px] h-20 sm:h-24'} bg-neutral-900 border border-neutral-700/60 rounded-lg overflow-hidden cursor-pointer group hover:border-[#CC0000] p-1.5 flex items-center justify-center transition-colors shadow-inner`}
                    onClick={() => setIsOpen(true)}
                >
                    {value ? (
                        (typeof value === 'string' && getYouTubeId(value)) ? (
                            <iframe 
                                src={`https://www.youtube.com/embed/${getYouTubeId(value)}?controls=0&mute=1&autoplay=1&loop=1`}
                                className="w-full h-full object-contain pointer-events-none"
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                            ></iframe>
                        ) : (typeof value === 'string' && value.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) ? (
                            <video src={value} className="w-full h-full object-contain" muted />
                        ) : (typeof value === 'string' && value.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv)(\?.*)?$/i)) ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900/20 text-blue-400 p-1">
                                <svg className="w-6 h-6 mb-1 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                <span className="text-[9px] font-mono truncate w-full text-center">Doc</span>
                            </div>
                        ) : (
                            <img src={value} alt="preview" className="w-full h-full object-contain" />
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-1 text-center p-1">
                            <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] font-medium leading-tight">Elegir media</span>
                        </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold bg-[#CC0000]/80 px-2 py-1 rounded">
                            Cambiar
                        </span>
                    </div>
                </div>

                {/* Botón para limpiar */}
                {value && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        title="Quitar archivo actual"
                        className="p-1 text-neutral-500 hover:text-red-400 transition-colors text-xs flex items-center gap-0.5 rounded hover:bg-neutral-800"
                    >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                )}
            </div>

            {/* Modal */}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6" style={{ zIndex: 99999 }}>
                    <div className="bg-neutral-900 rounded-2xl border border-neutral-700 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">

                        {/* Header del modal */}
                        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
                            <h3 className="text-lg font-black text-white">📁 Biblioteca de Medios</h3>
                            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white text-xl">✕</button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 p-4 border-b border-neutral-800">
                            {[
                                { id: 'library', label: '🖼️ Biblioteca' },
                                { id: 'upload', label: '⬆️ Subir archivo' },
                                { id: 'url', label: '🔗 Pegar URL' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                        tab === t.id
                                            ? 'bg-[#CC0000] text-white'
                                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 overflow-y-auto p-5">

                            {/* TAB: Biblioteca */}
                            {tab === 'library' && (
                                <div className="flex flex-col md:flex-row bg-neutral-900 overflow-hidden h-[50vh]">
                                    
                                    {/* Left Sidebar (Virtual Folders) */}
                                    <div className="w-full md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-neutral-800 bg-[#0a0a09] flex flex-row md:flex-col p-3 overflow-x-auto md:overflow-y-auto custom-scrollbar gap-2 md:gap-0 shrink-0">
                                        <p className="hidden md:block text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-3 px-2">📂 Carpetas</p>
                                        {[
                                            { id: 'all', icon: '🌌', label: 'Todo el Medios' },
                                            { id: 'images', icon: '🖼️', label: 'Imágenes / Fotos' },
                                            { id: 'videos', icon: '🎬', label: 'Producción Video' },
                                            { id: 'docs', icon: '📃', label: 'Documentos (PDF)' }
                                        ].map(f => (
                                            <button 
                                                key={f.id} 
                                                onClick={() => setFilter(f.id)} 
                                                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-3 md:mb-1 rounded-xl text-[10px] md:text-xs font-bold transition-all border whitespace-nowrap ${
                                                    filter === f.id 
                                                        ? 'bg-[#CC0000]/10 border-[#CC0000] text-[#CC0000]' 
                                                        : 'border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                                }`}
                                            >
                                                <span className="text-lg">{f.icon}</span>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Right Content (Grid) */}
                                    <div className="flex-1 overflow-y-auto p-5 relative">
                                        {filteredItems().length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-3">
                                                <span className="text-4xl opacity-50">🕳️</span>
                                                <p className="text-sm font-medium tracking-wide">Esta carpeta está vacía.</p>
                                                <button onClick={() => setTab('upload')} className="mt-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-full text-xs font-bold">Subir nuevo archivo</button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {filteredItems().map(item => (
                                                    <div
                                                        key={item.filename}
                                                        onClick={() => { onChange(item.url); setIsOpen(false); }}
                                                        className={`relative group cursor-pointer rounded-2xl overflow-hidden border-[3px] transition-all hover:scale-[1.02] ${value === item.url ? 'border-[#CC0000] shadow-[0_0_20px_rgba(204,0,0,0.4)]' : 'border-neutral-800 hover:border-neutral-500'}`}
                                                    >
                                                        <div className="aspect-square bg-black flex items-center justify-center relative overflow-hidden">
                                                            {item.type === 'document' ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900/10 text-blue-400 p-2">
                                                                    <svg className="w-10 h-10 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                                    <span className="text-[10px] font-mono truncate w-full text-center px-2">{item.originalName || item.filename}</span>
                                                                </div>
                                                            ) : isVideo(item) ? (
                                                                <video src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted autoPlay loop playsInline />
                                                            ) : (
                                                                <img src={item.url} alt={item.filename} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </div>
                                                        {/* Info overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                            <span className="text-white text-xs font-black w-full truncate">{item.originalName || '-'}</span>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className="text-gray-400 text-[10px] font-mono">{formatSize(item.size)}</span>
                                                                <span className="text-[#CC0000] text-[10px] font-bold">Seleccionar</span>
                                                            </div>
                                                        </div>
                                                        {/* Botón eliminar */}
                                                        <button
                                                            onClick={(e) => handleDelete(item.type, item.filename, e, item.url)}
                                                            className="absolute top-2 right-2 bg-red-600/80 backdrop-blur-md text-white text-[12px] w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110"
                                                            title="Eliminar de la bóveda"
                                                        >
                                                            ✕
                                                        </button>
                                                        {/* Marker seleccionado */}
                                                        {value === item.url && (
                                                            <div className="absolute top-2 left-2 bg-[#CC0000] text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg">
                                                                En uso
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB: Subir archivo */}
                            {tab === 'upload' && (
                                <div className="flex flex-col items-center justify-center h-48 gap-5">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept={
                                            accept === 'image' ? 'image/*' :
                                            accept === 'video' ? 'video/*' :
                                            accept === 'docs' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx' :
                                            'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                                        }
                                        onChange={handleFileUpload}
                                    />
                                    {uploading ? (
                                        <div className="w-full max-w-xs">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-white font-bold">Subiendo...</span>
                                                <span className="text-sm text-[#CC0000] font-bold">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#CC0000] rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                        const file = e.dataTransfer.files[0];
                                                        handleFileUpload({ target: { files: [file] } });
                                                    }
                                                }}
                                                className="w-full max-w-sm border-2 border-dashed border-neutral-600 hover:border-[#CC0000] hover:bg-[#CC0000]/10 rounded-2xl p-10 cursor-pointer transition-all text-center group"
                                            >
                                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📤</div>
                        <p className="text-white font-bold mb-1">Arrastra o haz clic para subir</p>
                                                <p className="text-neutral-500 text-xs">Imágenes: JPG, PNG, GIF, WebP, SVG · Videos: MP4, MOV · Docs: PDF, Office · Imágenes máx. 10 MB · Videos/Docs máx. 500 MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* TAB: URL */}
                            {tab === 'url' && (
                                <div className="flex flex-col gap-4 max-w-lg mx-auto mt-8">
                                    <p className="text-sm text-gray-400">Pega la URL de cualquier imagen o video desde internet, CDN, Cloudinary, etc.</p>
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://ejemplo.com/imagen.jpg"
                                        className="w-full p-3 bg-black border border-neutral-700 rounded-xl text-white focus:border-[#CC0000] outline-none text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSelectUrl()}
                                    />
                                    {urlInput && (
                                        <div className="w-full h-40 bg-neutral-800 rounded-xl overflow-hidden pointer-events-none relative flex items-center justify-center">
                                            {getYouTubeId(urlInput) ? (
                                                <iframe 
                                                    src={`https://www.youtube.com/embed/${getYouTubeId(urlInput)}?controls=0&mute=1&autoplay=1`}
                                                    className="w-full h-full object-contain"
                                                    frameBorder="0"
                                                ></iframe>
                                            ) : urlInput.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                                                <video src={urlInput} controls className="w-full h-full object-contain" />
                                            ) : (
                                                <img src={urlInput} alt="preview" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSelectUrl}
                                        disabled={!urlInput.trim()}
                                        className="px-6 py-3 bg-[#CC0000] text-white rounded-full font-black disabled:opacity-40 hover:bg-red-600 transition"
                                    >
                                        ✅ Usar esta URL
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}
