import React, { useState, useEffect } from 'react';
import MediaPicker from './MediaPicker';

export default function CeoEstudioPanel({ adminProfile }) {
  const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, devueltas, aprobadas
  const [mediaList, setMediaList] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPublishHUD, setShowPublishHUD] = useState(false);
  const [hudCaption, setHudCaption] = useState('');
  const [network, setNetwork] = useState('instagram');

  const username = adminProfile?.username?.toLowerCase() || '';
  const canUpload = ['alex', 'godzilla_admin'].includes(username) || adminProfile?.is_superadmin;
  const canReview = ['judith', 'godzilla_admin'].includes(username) || adminProfile?.is_superadmin;
  const canPublish = canReview; // Solo quien aprueba o superadmin puede publicar directamente

  // Mock fetch function para Phase 1 / TBD Backend integration
  const fetchMedia = async () => {
    // Aquí iría el fetch real: fetch(`/api/ceo-estudio/media?status=${activeTab}`)
    // Por ahora, usamos mock data
    const mockData = [
      { id: '1', url: 'https://via.placeholder.com/400x600?text=Draft+1', type: 'image', status: 'pending', uploader: 'alex', created_at: new Date().toISOString() },
      { id: '2', url: 'https://via.placeholder.com/800x400?text=Draft+2', type: 'image', status: 'pending', uploader: 'alex', created_at: new Date().toISOString() },
      { id: '3', url: 'https://via.placeholder.com/400x400?text=Devuelto', type: 'image', status: 'returned', feedback: 'El logo está muy grande', uploader: 'alex', returned_at: new Date().toISOString() },
      { id: '4', url: 'https://via.placeholder.com/400x400?text=Aprobado', type: 'image', status: 'approved', uploader: 'alex', created_at: new Date().toISOString() },
    ];
    setMediaList(mockData.filter(m => m.status === (activeTab === 'pendientes' ? 'pending' : activeTab === 'devueltas' ? 'returned' : 'approved')));
  };

  useEffect(() => {
    fetchMedia();
    setSelectedMedia(null);
  }, [activeTab]);

  const handleAction = async (action) => {
    if (!selectedMedia) return;
    if (action === 'return' && !feedback) {
        alert('Debes agregar comentarios para devolver la pieza.');
        return;
    }
    // const res = await fetch(`/api/ceo-estudio/media/${selectedMedia.id}/status`, { method: 'PUT', body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'returned', feedback }) });
    alert(`Pieza ${action === 'approve' ? 'APROBADA' : 'DEVUELTA'}.`);
    setSelectedMedia(null);
    setFeedback('');
    fetchMedia();
  };

  const handlePublishData = () => {
     alert(`✅ Comando enviado al bot de ${network}. La publicación se está procesando en background.`);
     setShowPublishHUD(false);
     setSelectedMedia(null);
     fetchMedia();
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-black text-white overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d946ef]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="mb-6 border-b border-[#d946ef]/30 pb-4 shrink-0 relative z-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-widest text-[#d946ef] drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] flex items-center gap-2">
            <span>👑</span> CEO ESTUDIO
          </h2>
          <p className="text-sm text-neutral-400 mt-1 uppercase tracking-widest">Estación de Flujo: Aprobación de Audiovisuales</p>
        </div>
        
        {canUpload && (
            <button className="bg-[#d946ef] text-white px-6 py-2 rounded-xl font-bold shadow-[0_4px_15px_rgba(217,70,239,0.5)] hover:bg-white hover:text-[#d946ef] transition-colors">
                + Subir Archivos a Revisión
            </button>
        )}
      </div>

      <div className="flex gap-4 mb-6 shrink-0 z-10 relative">
        {[
            { id: 'pendientes', label: 'Pendientes por Revisar', icon: '⏳' },
            { id: 'devueltas', label: 'Devueltas (Requiere Corrección)', icon: '🔙' },
            { id: 'aprobadas', label: 'Aprobadas', icon: '✅' },
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all border ${activeTab === tab.id ? 'bg-[#d946ef] border-[#d946ef] text-white shadow-md' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-[#d946ef]/50'}`}>
                {tab.icon} {tab.label}
            </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto z-10 relative grid grid-cols-2 md:grid-cols-4 gap-4 pb-10 custom-scrollbar">
        {mediaList.map(item => (
            <div key={item.id} onClick={() => setSelectedMedia(item)}
                 className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-700 hover:border-[#d946ef] cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col group relative">
                 <div className="h-40 bg-black flex items-center justify-center overflow-hidden">
                    <img src={item.url} alt="Media" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                 </div>
                 <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                        <p className="text-xs text-neutral-400 font-bold mb-1 uppercase tracking-wider">Subido por: {item.uploader}</p>
                        <p className="text-[10px] text-neutral-600">{new Date(item.created_at || item.returned_at).toLocaleDateString()}</p>
                    </div>
                 </div>
                 {activeTab === 'devueltas' && (
                     <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded font-bold shadow-md">EXPIRA EN 7 DÍAS</div>
                 )}
            </div>
        ))}

        {mediaList.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl">
                <span className="text-4xl mb-3">👻</span>
                <p className="font-bold">No hay archivos en esta sección.</p>
            </div>
        )}
      </div>

      {/* MODAL DE REVISIÓN / APROBACIÓN */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(217,70,239,0.15)]">
                
                {/* Visualizador */}
                <div className="flex-1 bg-black flex items-center justify-center relative p-4">
                    <img src={selectedMedia.url} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                    <button onClick={() => setSelectedMedia(null)} className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-colors">✕</button>
                    {activeTab === 'devueltas' && (
                        <a href={selectedMedia.url} download className="absolute bottom-4 left-4 bg-white/20 hover:bg-white text-white hover:text-black px-4 py-2 rounded-full text-xs font-bold transition-colors">⬇️ Descargar Archivo</a>
                    )}
                </div>

                {/* Panel de Control Lateral */}
                <div className="w-full md:w-96 bg-neutral-950 p-6 flex flex-col border-l border-neutral-800">
                    <h3 className="text-xl font-black text-white mb-1 uppercase">Gestión de Activo</h3>
                    <p className="text-xs text-neutral-500 mb-6">Subeido por: <span className="text-white">{selectedMedia.uploader}</span></p>

                    {activeTab === 'pendientes' && canReview && (
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-bold text-neutral-400 mb-2 block uppercase tracking-widest">Notas de Corrección (Obligatorio si se devuelve):</label>
                            <textarea 
                                value={feedback} 
                                onChange={e => setFeedback(e.target.value)} 
                                className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white text-sm focus:border-[#d946ef] outline-none resize-none mb-6" 
                                placeholder="Escribe aquí qué debe corregir Alex..."
                            />

                            <div className="mt-auto space-y-3">
                                <button onClick={() => handleAction('approve')} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all transform hover:scale-105">✅ APROBAR</button>
                                <button onClick={() => handleAction('return')} className="w-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-black py-4 rounded-xl text-lg transition-all">🔙 DEVOLVER A CORRECCIÓN</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'devueltas' && (
                         <div className="flex-1 flex flex-col">
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-4">
                                <p className="text-xs font-bold text-red-400 mb-2 uppercase">Notas de Devolución:</p>
                                <p className="text-sm text-white">{selectedMedia.feedback || 'Sin notas.'}</p>
                            </div>
                            <div className="mt-auto">
                                <p className="text-xs text-center text-neutral-500">Este archivo se purgará en 7 días tras su devolución.</p>
                            </div>
                         </div>
                    )}

                    {activeTab === 'aprobadas' && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl mb-6">
                                <p className="text-sm font-bold text-green-400 uppercase text-center flex items-center justify-center gap-2"><span>✅</span> LISTO PARA PUBLICACIÓN</p>
                            </div>
                            
                            <p className="text-xs text-neutral-400 mb-4 text-center">Inicia el flujo de publicación oficial emulando el HUD nativo de las redes sociales.</p>
                            
                            {canPublish ? (
                                <button onClick={() => setShowPublishHUD(true)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-white hover:to-white text-white hover:text-purple-600 font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                                    📱 PUBLICAR AHORA
                                </button>
                            ) : (
                                <button disabled className="w-full bg-neutral-800/50 text-neutral-500 font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 cursor-not-allowed border border-neutral-800">
                                    🔒 PENDIENTE DE PUBLICACIÓN DE JUDITH
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* HUD DE PUBLICACIÓN (SIMULACIÓN REDES SOCIALES) */}
      {showPublishHUD && selectedMedia && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
              <div className="w-full max-w-4xl flex gap-6 h-[80vh]">
                  {/* Creador de Post */}
                  <div className="flex-1 bg-neutral-900 border border-neutral-700 rounded-3xl p-6 flex flex-col">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
                          <h3 className="text-xl font-bold">Publicar Activo</h3>
                          <button onClick={() => setShowPublishHUD(false)} className="text-neutral-500 hover:text-white">✕ Cancelar</button>
                      </div>
                      
                      <label className="text-xs font-bold text-neutral-400 mb-2">Red Social Destino</label>
                      <div className="flex gap-2 mb-6">
                            <button onClick={() => setNetwork('instagram')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Instagram</button>
                            <button onClick={() => setNetwork('facebook')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'facebook' ? 'bg-[#1877F2] text-white border-transparent' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Facebook</button>
                            <button onClick={() => setNetwork('tiktok')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${network === 'tiktok' ? 'bg-black border-[#00f2fe] text-white shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>TikTok</button>
                      </div>

                      <label className="text-xs font-bold text-neutral-400 mb-2">Caption / Descripción</label>
                      <textarea 
                          value={hudCaption} onChange={e => setHudCaption(e.target.value)}
                          className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-white outline-none resize-none mb-4" 
                          placeholder="Escribe el texto de la publicación..."
                      />

                      <button onClick={handlePublishData} className="mt-auto w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:scale-[1.02] transition-transform">
                          🚀 CONFIRMAR Y ENVIAR AL BOT
                      </button>
                  </div>

                  {/* PREVIEW HUD CELULAR */}
                  <div className="w-[375px] bg-black border-[8px] border-neutral-800 rounded-[3rem] overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                      {/* Notch */}
                      <div className="absolute top-0 inset-x-0 h-6 shrink-0 flex justify-center z-50">
                          <div className="w-40 h-6 bg-neutral-800 rounded-b-2xl"></div>
                      </div>

                      {/* IG Mockup */}
                      {network === 'instagram' && (
                          <div className="flex-1 bg-white text-black flex flex-col pt-8">
                              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                  <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[2px]">
                                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-0.5"><img src="/favicon.png" className="rounded-full bg-black"/></div>
                                      </div>
                                      <p className="font-bold text-sm">godzilla.consulting</p>
                                  </div>
                                  <span className="font-black">⋮</span>
                              </div>
                              <div className="bg-black w-full aspect-square flex items-center justify-center overflow-hidden">
                                  <img src={selectedMedia.url} className="w-full object-cover" />
                              </div>
                              <div className="p-3">
                                  <div className="flex gap-4 mb-2">
                                      <span className="text-xl">❤️</span> <span className="text-xl">💬</span> <span className="text-xl">↗️</span>
                                  </div>
                                  <p className="text-sm font-bold mb-1">Les gusta a oscar.ia y otros</p>
                                  <p className="text-sm line-clamp-2"><span className="font-bold">godzilla.consulting</span> {hudCaption || 'Tu texto aparecerá aquí...'}</p>
                              </div>
                          </div>
                      )}

                      {/* FB Mockup */}
                      {network === 'facebook' && (
                          <div className="flex-1 bg-neutral-200 text-black flex flex-col pt-8">
                              <div className="bg-white p-3 mb-2">
                                  <div className="flex items-center gap-2 mb-2">
                                      <img src="/favicon.png" className="w-10 h-10 rounded-full bg-black" />
                                      <div>
                                          <p className="font-bold text-sm leading-none">Godzilla Consulting</p>
                                          <p className="text-xs text-gray-500">Justo ahora • 🌎</p>
                                      </div>
                                  </div>
                                  <p className="text-sm mb-2">{hudCaption || 'Tu texto aparecerá aquí...'}</p>
                                  <div className="bg-black w-[calc(100%+1.5rem)] -mx-3  flex items-center justify-center overflow-hidden">
                                      <img src={selectedMedia.url} className="w-full object-cover" />
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* TikTok Mockup */}
                      {network === 'tiktok' && (
                          <div className="flex-1 bg-black text-white flex flex-col relative pt-0">
                               <img src={selectedMedia.url} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                               <div className="absolute inset-y-0 right-2 flex flex-col justify-end pb-20 gap-4">
                                   <div className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden"><img src="/favicon.png" className="bg-black"/></div>
                                   <div className="text-center"><p className="text-3xl">❤️</p><p className="text-xs font-bold">128K</p></div>
                                   <div className="text-center"><p className="text-3xl">💬</p><p className="text-xs font-bold">1024</p></div>
                               </div>
                               <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                   <p className="font-bold text-sm">@godzilla.consulting</p>
                                   <p className="text-sm mt-1 mb-2 line-clamp-2">{hudCaption || 'Tu texto aparecerá aquí...'}</p>
                                   <p className="text-xs font-bold flex items-center gap-1">🎵 Sonido original - Trending</p>
                               </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
