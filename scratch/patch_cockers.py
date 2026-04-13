import re

with open('src/components/CockersStudio.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. State array injection
state_target = """    const [refImage, setRefImage] = useState('');
    const [refiningTasks, setRefiningTasks] = useState({});"""
state_replacement = """    const [refImage, setRefImage] = useState('');
    const [refiningTasks, setRefiningTasks] = useState({});
    
    // Purificador UI States
    const [purifyingStatus, setPurifyingStatus] = useState(null); // 'uploading' | 'processing' | null
    const [purifiedResult, setPurifiedResult] = useState('');
    
    const handlePurifyVideo = async (file) => {
        if (!file) return;
        setPurifyingStatus('uploading');
        setPurifiedResult('');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/purify-video`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const data = await res.json();
            if (data.job_id) {
                setPurifyingStatus('processing');
                
                // Poll checkRenderStatus
                const pollTimer = setInterval(async () => {
                    try {
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const stData = await stRes.json();
                        
                        if (stData.status === 'succeed') {
                            clearInterval(pollTimer);
                            setPurifyingStatus(null);
                            setPurifiedResult(stData.result_url);
                        } else if (stData.status === 'failed' || stData.status === 'error') {
                            clearInterval(pollTimer);
                            setPurifyingStatus(null);
                            alert("FFMPEG Error de Purificaci\u00f3n: " + (stData.error || 'Unknown'));
                        }
                    } catch (pollErr) {
                        console.error('Polling error', pollErr);
                    }
                }, 3000);
            } else {
                setPurifyingStatus(null);
                alert("Fallo al iniciar el purificador: " + (data.error || 'Server error'));
            }
        } catch (e) {
            setPurifyingStatus(null);
            console.error('Upload Error:', e);
            alert("Error de conexi\u00f3n con el Motor Local.");
        }
    };"""
c = c.replace(state_target, state_replacement)

# 2. Add 'Limpiador' tab to UI
tab_target = """                        {/* Selector Interno (Fotogramas vs Ingredientes) */}
                        <div className="flex bg-[#222221] rounded-full p-1 mb-4">
                            <button onClick={()=>setActiveTab('Fotogramas')} className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${activeTab==='Fotogramas' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🖼 Fotogramas
                            </button>
                            <button onClick={()=>setActiveTab('Ingredientes')} className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-colors ${activeTab==='Ingredientes' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🧩 Ingredientes
                            </button>
                        </div>

                        {/* Aspect Ratios & Durations */}
                        {activeTab === 'Fotogramas' ? ("""

tab_replacement = """                        {/* Selector Interno (Fotogramas vs Ingredientes vs Limpiador) */}
                        <div className="flex bg-[#222221] rounded-full p-1 mb-4">
                            <button onClick={()=>setActiveTab('Fotogramas')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-colors ${activeTab==='Fotogramas' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🖼 Fotogramas
                            </button>
                            <button onClick={()=>setActiveTab('Ingredientes')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-colors ${activeTab==='Ingredientes' ? 'bg-[#3a3a39] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
                                🧩 Ingredientes
                            </button>
                            <button onClick={()=>setActiveTab('Purificador')} className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-full transition-colors ${activeTab==='Purificador' ? 'bg-[#CC0000] text-white shadow-[0_0_10px_rgba(204,0,0,0.5)]' : 'text-neutral-400 hover:text-[#CC0000]'}`}>
                                ✨ Limpiador
                            </button>
                        </div>

                        {/* Aspect Ratios & Durations */}
                        {activeTab === 'Fotogramas' ? ("""
c = c.replace(tab_target, tab_replacement)

# 3. Add Purifier UI Body
body_target = """                        ) : (
                            <div className="flex items-center flex-col justify-center h-[120px] mb-4 border-2 border-dashed border-neutral-800 rounded-2xl hover:border-neutral-600 transition-colors cursor-pointer relative">
                                <span className="text-2xl mb-1">Upload</span>
                                <span className="text-xs text-neutral-500 font-bold uppercase">Sube una imagen de referencia</span>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e)=>{
                                       if(e.target.files && e.target.files[0]){
                                           const reader = new FileReader();
                                           reader.onload = (ev) => {
                                               setRefImage(ev.target.result);
                                               e.target.value = null; // Fix de caché de input React
                                           };
                                           reader.readAsDataURL(e.target.files[0]);
                                           setActiveTab('Fotogramas');
                                       }
                                }}/>
                            </div>
                        )}"""

body_replacement = """                        ) : activeTab === 'Ingredientes' ? (
                            <div className="flex items-center flex-col justify-center h-[120px] mb-4 border-2 border-dashed border-neutral-800 rounded-2xl hover:border-neutral-600 transition-colors cursor-pointer relative">
                                <span className="text-2xl mb-1">Upload</span>
                                <span className="text-xs text-neutral-500 font-bold uppercase">Sube una imagen de referencia</span>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e)=>{
                                       if(e.target.files && e.target.files[0]){
                                           const reader = new FileReader();
                                           reader.onload = (ev) => {
                                               setRefImage(ev.target.result);
                                               e.target.value = null; // Fix de caché de input React
                                           };
                                           reader.readAsDataURL(e.target.files[0]);
                                           setActiveTab('Fotogramas');
                                       }
                                }}/>
                            </div>
                        ) : (
                            <div className="flex flex-col mb-4 p-4 border border-[#CC0000]/30 bg-[#CC0000]/5 rounded-2xl">
                                <p className="text-[10px] text-neutral-400 font-medium mb-3 leading-relaxed">Sube un video manchado (Ej: Kling) y el Motor lo limpiará con <span className="font-bold text-white">-crf 18 Lossless</span>.</p>
                                
                                {purifyingStatus ? (
                                    <div className="flex items-center justify-center p-6 border border-neutral-800 rounded-xl bg-black">
                                       <div className="flex flex-col items-center gap-2 animate-pulse">
                                          <div className="w-5 h-5 rounded-full border-t-2 border-[#CC0000] animate-spin"></div>
                                          <span className="text-[10px] text-white font-bold uppercase tracking-widest">{purifyingStatus === 'uploading' ? 'Subiendo 300MB/s...' : 'Destruyendo Marca en CPU...'}</span>
                                       </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center flex-col justify-center h-[100px] border-2 border-dashed border-[#CC0000]/50 rounded-xl hover:border-[#CC0000] hover:bg-[#CC0000]/10 transition-colors cursor-pointer relative">
                                        <span className="text-2xl mb-1">✨</span>
                                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">Arrastra MP4 a Limpiar</span>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="video/mp4,video/x-m4v,video/*" onChange={(e)=>{
                                            if(e.target.files && e.target.files[0]) {
                                                 handlePurifyVideo(e.target.files[0]);
                                                 e.target.value = null;
                                            }
                                        }}/>
                                    </div>
                                )}
                                
                                {purifiedResult && (
                                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between">
                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Video Puro Listo</span>
                                        <button onClick={() => window.open(purifiedResult, '_blank')} className="px-3 py-1 bg-green-500 text-black font-black text-[10px] uppercase rounded hover:bg-green-400 -mr-1">Ver/Descargar</button>
                                    </div>
                                )}
                            </div>
                        )}"""

c = c.replace(body_target, body_replacement)

with open('src/components/CockersStudio.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
