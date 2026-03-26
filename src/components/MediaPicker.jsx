import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
const IS_PROD = !import.meta.env.DEV;

/**
 * MediaPicker — Componente para subir y seleccionar imágenes/videos.
 * En producción usa Vercel Blob Store (/api/blob); en dev usa /api/media local.
 */
export default function MediaPicker({ value, onChange, accept = 'all', label = 'Imagen / Media' }) {
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
            // Producción: Blob Store | Dev: local media
            const endpoint = IS_PROD ? `${API}/api/blob/list` : `${API}/api/media`;
            const r = await fetch(endpoint);
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

        if (IS_PROD) {
            // ─── PRODUCCIÓN: Subir a Vercel Blob Store (Client Upload) ───────────────
            try {
                // Importación dinámica de la librería del cliente para Vercel Blob
                const { upload } = await import('@vercel/blob/client');

                const newBlob = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: `${API}/api/blob/upload-client`,
                    onUploadProgress: (progressEvent) => {
                        setUploadProgress(progressEvent.percentage);
                    }
                });

                await fetchMedia();
                onChange(newBlob.url);
                setIsOpen(false);
            } catch (err) {
                console.error('Blob upload error:', err);
                alert('Error en la subida al Blob Store. Revisa la consola para más detalles.');
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        } else {
            // ─── DESARROLLO: Subir a /api/media local ────────────────
            const formData = new FormData();
            formData.append('file', file);
            try {
                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) {
                        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                    }
                };
                xhr.onload = async () => {
                    try {
                        if (xhr.status >= 400) throw new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
                        const result = JSON.parse(xhr.responseText);
                        if (result.success) {
                            await fetchMedia();
                            onChange(result.url);
                            setIsOpen(false);
                        } else {
                            alert(result.error || 'Error al subir');
                        }
                    } catch (err) {
                        console.error('Upload error:', err);
                        alert('Error al subir archivo.');
                    } finally {
                        setUploading(false);
                        setUploadProgress(0);
                    }
                };
                xhr.onerror = () => { setUploading(false); };
                xhr.open('POST', `${API}/api/media/upload`);
                xhr.send(formData);
            } catch (e) {
                setUploading(false);
            }
        }
    };

    const handleDelete = async (type, filename, e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar ${filename}?`)) return;
        if (IS_PROD) {
            // Blob Store: necesita la URL completa
            const url = typeof filename === 'string' && filename.startsWith('http') ? filename : '';
            if (url) {
                await fetch(`${API}/api/blob/delete`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });
            }
        } else {
            await fetch(`${API}/api/media/${type}/${filename}`, { method: 'DELETE' });
        }
        fetchMedia();
    };

    const handleSelectUrl = () => {
        if (urlInput.trim()) {
            onChange(urlInput.trim());
            setIsOpen(false);
            setUrlInput('');
        }
    };

    const filteredItems = () => {
        if (accept === 'image' || filter === 'images') return media.images;
        if (accept === 'video' || filter === 'videos') return media.videos;
        return [...(media.images || []), ...(media.videos || [])];
    };

    const isVideo = (item) => item.type === 'videos';

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 block">{label}</label>

            {/* Preview del valor actual */}
            <div
                className="relative w-32 h-32 bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden cursor-pointer group hover:border-[#CC0000] p-2 flex items-center justify-center transition-colors"
                onClick={() => setIsOpen(true)}
            >
                {value ? (
                    value.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                        <video src={value} className="w-full h-full object-contain" muted />
                    ) : (
                        <img src={value} alt="preview" className="w-full h-full object-contain" />
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Clic para agregar imagen/video</span>
                    </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">
                        ✏️ Cambiar archivo
                    </span>
                </div>
            </div>

            {/* Botón para limpiar */}
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                >
                    ✕ Quitar media
                </button>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
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
                            {tab === 'library' && accept === 'all' && (
                                <div className="ml-auto flex gap-1">
                                    {['all', 'images', 'videos'].map(f => (
                                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}>
                                            {f === 'all' ? 'Todo' : f === 'images' ? '🖼️ Imágenes' : '🎬 Videos'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 overflow-y-auto p-5">

                            {/* TAB: Biblioteca */}
                            {tab === 'library' && (
                                <div>
                                    {filteredItems().length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-3">
                                            <span className="text-4xl">📂</span>
                                            <p className="text-sm">No hay archivos. Sube uno para comenzar.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-3">
                                            {filteredItems().map(item => (
                                                <div
                                                    key={item.filename}
                                                    onClick={() => { onChange(item.url); setIsOpen(false); }}
                                                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${value === item.url ? 'border-[#CC0000] shadow-[0_0_12px_rgba(204,0,0,0.5)]' : 'border-transparent hover:border-neutral-600'}`}
                                                >
                                                    <div className="aspect-square bg-neutral-800">
                                                        {isVideo(item) ? (
                                                            <video src={item.url} className="w-full h-full object-cover" muted />
                                                        ) : (
                                                            <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                    {/* Info overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                                                        <span className="text-white text-xs font-bold text-center truncate w-full text-center">✅ Seleccionar</span>
                                                        <span className="text-gray-300 text-[10px]">{formatSize(item.size)}</span>
                                                    </div>
                                                    {/* Badge tipo */}
                                                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                                                        {isVideo(item) ? '🎬' : '🖼️'}
                                                    </div>
                                                    {/* Botón eliminar */}
                                                    <button
                                                        onClick={(e) => handleDelete(item.type, IS_PROD ? item.url : item.filename, e)}
                                                        className="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                                    >
                                                        ✕
                                                    </button>
                                                    {/* Marker seleccionado */}
                                                    {value === item.url && (
                                                        <div className="absolute bottom-1 right-1 bg-[#CC0000] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                            ✓ Actual
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                            'image/*,video/*'
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
                                                <p className="text-neutral-500 text-xs">Imágenes: JPG, PNG, GIF, WebP, SVG · Videos: MP4, WebM · Máx. 200 MB</p>
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
                                        <div className="w-full h-40 bg-neutral-800 rounded-xl overflow-hidden">
                                            {urlInput.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
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
                </div>
            )}
        </div>
    );
}
