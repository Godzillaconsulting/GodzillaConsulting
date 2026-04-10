const fs = require('fs');
const content = fs.readFileSync('src/components/AnalyticsDashboard.jsx', 'utf8');

// Chunk 1: Inject State
const search1 = `const fakePosts = isVideo ? [
        { id: 1, title: 'Reel A - Hook Problema B2B', views: '24.5K', likes: 1205, comments: 84 },
        { id: 2, title: 'Testimonio Cliente IA', views: '18.2K', likes: 980, comments: 45 },
        { id: 3, title: 'Behind The Scenes - Código', views: '12.1K', likes: 640, comments: 22 }
    ] : [
        { id: 1, title: 'Carrusel: 3 Errores de Embudos', views: '8.4K', likes: 310, comments: 18 },
        { id: 2, title: 'Anuncio: Auditoría Gratuita', views: '5.2K', likes: 125, comments: 5 },
        { id: 3, title: 'Post: Novedades del Mercado', views: '3.1K', likes: 88, comments: 2 }
    ];`;

const replacement1 = `const [realPosts, setRealPosts] = React.useState([]);
    const [loadingPosts, setLoadingPosts] = React.useState(true);
    const [apiError, setApiError] = React.useState(null);

    React.useEffect(() => {
        const fetchPosts = async () => {
            setLoadingPosts(true);
            setApiError(null);
            try {
                const t = localStorage.getItem('adminToken');
                const url = \`/api/analytics/proxy-posts?network=\${network.id}\`;
                const r = await fetch(url, { headers: { Authorization: \`Bearer \${t}\` } });
                const j = await r.json();
                if (j.success) {
                    setRealPosts(j.posts || []);
                } else {
                    setApiError(j.error || 'No se pudieron obtener métricas reales');
                }
            } catch (e) {
                setApiError('Fallo en la comunicación con Graph API/Proxy');
            } finally {
                setLoadingPosts(false);
            }
        };
        if (network.id === 'web') {
            setLoadingPosts(false);
            setRealPosts([]);
        } else {
            fetchPosts();
        }
    }, [network.id]);`;

let finalContent = content.replace(search1, replacement1);

// Chunk 2: Inject Map
const search2 = `                            <div className="space-y-3">
                                {fakePosts.map(post => (
                                    <a href={network.id === 'tiktok' ? 'https://tiktok.com/@godzillaconsulting' : 'https://instagram.com/godzilla.consulting'} target="_blank" rel="noopener noreferrer" key={post.id} className="bg-[#111]/60 backdrop-blur-md border border-white/5 p-4 rounded-xl hover:border-[#FF0055]/30 hover:bg-[#161615] transition-all flex justify-between items-center cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-500">
                                                <PlayCircle size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white line-clamp-1">{post.title}</span>
                                                <span className="text-[10px] text-[#00F0FF]">{post.views} Vistas</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-bold text-neutral-500">
                                            <div className="flex items-center gap-1.5 hover:text-white"><Heart size={14} className="text-[#FF0055]" />{post.likes}</div>
                                            <div className="flex items-center gap-1.5 hover:text-white"><MessageSquare size={14} className="text-[#FFEA00]" />{post.comments}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>`;

const replacement2 = `                            <div className="space-y-3 min-h-[150px]">
                                {loadingPosts ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-500 py-6">
                                        <div className="w-6 h-6 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-[#00F0FF]">Extrayendo Red...</span>
                                    </div>
                                ) : apiError ? (
                                    <div className="bg-[#111]/60 backdrop-blur-md border border-[#FF0055]/30 p-4 rounded-xl text-center shadow-[0_0_15px_rgba(255,0,85,0.1)]">
                                        <p className="text-sm text-[#FF0055] font-bold pb-1">⚠️ Conexión API Denegada</p>
                                        <p className="text-[11px] text-neutral-400 leading-snug">{apiError}</p>
                                    </div>
                                ) : realPosts.length === 0 ? (
                                    <div className="bg-[#111]/40 border border-white/5 p-4 rounded-xl text-center">
                                        <p className="text-xs text-neutral-500 font-bold uppercase">No hay contenido recuperable por API</p>
                                    </div>
                                ) : (
                                    realPosts.map((post, index) => (
                                        <a href={post.url} target="_blank" rel="noopener noreferrer" key={post.id || index} className="bg-[#111]/60 backdrop-blur-md border border-white/5 p-4 rounded-xl hover:border-[#FF0055]/30 hover:bg-[#161615] transition-all flex justify-between items-center cursor-pointer group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-500 group-hover:text-[#FF0055] transition-colors relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-[#FF0055]/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                                    <PlayCircle size={18} className="relative z-10" />
                                                </div>
                                                <div className="flex flex-col flex-1 max-w-[140px] lg:max-w-[200px]">
                                                    <span className="text-sm font-bold text-white line-clamp-1 group-hover:underline">{post.title}</span>
                                                    <span className="text-[10px] text-[#00F0FF] tracking-widest uppercase">{post.views}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold text-neutral-500">
                                                <div className="flex items-center gap-1.5 group-hover:text-white transition-colors"><Heart size={14} className="text-[#FF0055]" />{post.likes}</div>
                                                <div className="flex items-center gap-1.5 group-hover:text-white transition-colors"><MessageSquare size={14} className="text-[#FFEA00]" />{post.comments}</div>
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>`;

finalContent = finalContent.replace(search2.replace(/\r\n/g, '\n'), replacement2);
finalContent = finalContent.replace(search2, replacement2);
finalContent = finalContent.replace(search1.replace(/\r\n/g, '\n'), replacement1);
finalContent = finalContent.replace(search1, replacement1);

fs.writeFileSync('src/components/AnalyticsDashboard.jsx', finalContent);
console.log('DOM Replaced Successfully');
