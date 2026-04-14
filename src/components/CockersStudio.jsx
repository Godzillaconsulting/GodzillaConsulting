import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Masonry from 'react-masonry-css';
import MediaPicker from './MediaPicker';
const COMMUNITY_GALLERY_POOL = [
    { img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=700&auto=format&fit=crop', prompt: 'Liquid metallic fluid art, dark neon chromatic aberration, hyperrealistic 8k uhd, dslr', tag: 'Liquid Metal', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=700&auto=format&fit=crop', prompt: 'Epic aerial planet view from space, milky way background, Unreal Engine 5, volumetric clouds, 8k', tag: 'Space Epic', model: 'Sora LCM' },
    { img: 'https://images.unsplash.com/photo-1542051812871-75fe5009f424?q=80&w=700&auto=format&fit=crop', prompt: 'Neon cyberpunk street at night, rainy puddles, blade runner cinematic reflection, 35mm lens', tag: 'Cyberpunk Calles', model: 'Imagen 3 Ultra' },
    { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=700&auto=format&fit=crop', prompt: 'Commercial macro product shot, f/2.8 aperture, soft studio lighting, blurred bokeh background, ultra detailed label', tag: 'Macro Producto', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=700&auto=format&fit=crop', prompt: 'Aerial drone shot over icy mountains at golden hour, volumetric rays, unreal engine, national geographic style', tag: 'Drone Épico', model: 'Sora LCM' },
    { img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=700&auto=format&fit=crop', prompt: 'Abstract colorful geometric minimal art, sharp lines, vibrant complementary palette, dark background', tag: 'Geométrico', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=700&auto=format&fit=crop', prompt: 'Studio portrait editorial fashion, contrasty rim lighting, film grain, Hasselblad camera, fashion magazine cover', tag: 'Editorial Fashion', model: 'Imagen 3 Ultra' },
    { img: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=700&auto=format&fit=crop', prompt: 'Majestic mountain landscape, 35mm analog film photography, natural golden hour, highly textured raw photo', tag: '35mm Film', model: 'Sora LCM' },
    { img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=700&auto=format&fit=crop', prompt: 'Futuristic cyberspace holographic interface, neon data streams, blue tones, dark environment, matrix style', tag: 'Cyber Interface', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=700&auto=format&fit=crop', prompt: 'Dark moody minimalist interior architecture, brutalist concrete walls, warm hidden led strips, 8k render, octane render', tag: 'Brutalist Arch', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?q=80&w=700&auto=format&fit=crop', prompt: 'Macro shot of a glowing neon jellyfish in deep dark ocean, bioluminescence, highly detailed, national geographic 8k', tag: 'Bioluminescence', model: 'Gemini 3 Pro' },
    { img: 'https://images.unsplash.com/photo-1563603357963-439f52473623?q=80&w=700&auto=format&fit=crop', prompt: 'Synthwave outrun grid sunset, glowing magenta sun, vectorized retro horizon, 80s arcade style aesthetics', tag: 'Synthwave 80s', model: 'Gemini 3.1 Flash' },
    { img: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=700&auto=format&fit=crop', prompt: 'Mystical dark forest with glowing mystical mushrooms, ethereal blue fog, cinematic fantasy concept art, highly detailed', tag: 'Dark Fantasy', model: 'Sora LCM' },
    { img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=700&auto=format&fit=crop', prompt: 'High key beauty portrait, dripping gold paint on skin, macro lens, incredibly detailed skin texture, ultra realistic', tag: 'Gold Beauty', model: 'Imagen 4 Ultra' },
    { img: 'https://images.unsplash.com/photo-1531297122539-56c285bf8ee1?q=80&w=700&auto=format&fit=crop', prompt: 'Hardware motherboard glowing with neon blue and pink laser data streams, cyberpunk tech core, macro electronics', tag: 'Tech Core', model: 'Gemini 3 Pro' },
    { img: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=700&auto=format&fit=crop', prompt: 'Abstract corporate 3d glassmorphism UI elements floating against dark space, frosted glass texture, modern web3 design', tag: 'Glassmorphism', model: 'Imagen 4 Ultra' }
];

export default function CockersStudio({ adminProfile }) {
    const [queue, setQueue] = useState([]);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [renderingAI, setRenderingAI] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    
    // UI States para el Generador Profesional
    const [credits, setCredits] = useState(250); // Saldo Ficticio Inicial Cuentas Plus
    const [genMode, setGenMode] = useState('imagen'); // 'imagen' | 'video'
    const [activeTab, setActiveTab] = useState('Fotogramas'); // 'Fotogramas' | 'Ingredientes'
    
    // Auth & Roles
    const isCockers = adminProfile?.role === 'cockers' || adminProfile?.username?.toLowerCase() === 'alex' || adminProfile?.username?.toLowerCase() === 'cockers';
    const isSuperAdmin = adminProfile?.is_superadmin;

    // Galería Comunitaria Dinámica
    const [communityGallery, setCommunityGallery] = useState(() => {
        const shuffled = [...COMMUNITY_GALLERY_POOL].sort(() => 0.5 - Math.random());
        // Interceptamos la carga inicial (que trae los default Unsplash) y los convertimos en renders puros FLUX dinámicos
        return shuffled.slice(0, 12).map(item => ({
            ...item,
            img: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.prompt)}?width=500&height=500&nologo=true&model=flux&seed=${Math.floor(Math.random() * 99999)}`
        }));
    });
    const [isFetchingInspiration, setIsFetchingInspiration] = useState(false);
    
    const fetchDynamicInspiration = async () => {
        setIsFetchingInspiration(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/inspiration`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.gallery) {
                setCommunityGallery(data.gallery);
            } else {
                alert("Falló la IA: " + data.error);
            }
        } catch (e) {
            console.error("Inspiration Error", e);
        }
        setIsFetchingInspiration(false);
    };

    const canSeeAll = isCockers || isSuperAdmin || adminProfile?.username?.toLowerCase() === 'oscar';
    
    // Outbox State
    const [showOutbox, setShowOutbox] = useState(false);
    const [outboxTab, setOutboxTab] = useState('enviadas'); // 'enviadas' | 'aprobadas' | 'correcciones'

    // States del Redactor IA (Asistente Copywriting)
    const [showScriptGen, setShowScriptGen] = useState(false);
    const [scriptChatHistory, setScriptChatHistory] = useState([
        { role: 'ai', text: '¡Hola Director! ¿Qué necesitas que escriba o corrija de este post?' }
    ]);
    const [scriptChatInput, setScriptChatInput] = useState('');
    
    // Configuración AI
    const [finalPrompt, setFinalPrompt] = useState('');
    const [selectedFilters, setSelectedFilters] = useState([]);
    
    // Lista Visual de Filtros de Fotografía Profesionales
    const PHOTO_FILTERS = [
        { id: 'cinematic', label: '🎥 Cinemático', prompt: 'Cinematic lighting, dramatic shadows, volumetric fog, dark mood, color grading, 8k resolution, highly detailed' },
        { id: 'macro', label: '📸 Macro Lente', prompt: 'Macro photography, extreme depth of field, f/2.8 aperture, soft background bokeh, sharp subject focus, commercial studio lighting' },
        { id: 'cyberpunk', label: '👽 Cyberpunk Neo', prompt: 'Cyberpunk aesthetic, glowing neon purple and blue lights, rainy night, wet reflective puddles, blade runner style' },
        { id: 'vintage', label: '🎞️ Analógico 90s', prompt: '1990s analog 35mm film photography, polaroid style, light film grain, nostalgic faded colors, warm tone' },
        { id: 'editorial', label: '👠 Alta Costura', prompt: 'Editorial fashion photography, high contrast rim lighting, Vogue magazine cover style, Hasselblad medium format camera' },
        { id: 'drone', label: '🦅 Vista de Drone', prompt: 'Epic aerial drone shot, landscape photography, majestic, golden hour lighting, wide angle, National Geographic style' },
        { id: 'surreal', label: '🌀 Surrealismo 3D', prompt: 'Abstract surrealism 3D render, octane render, intricate geometry, dream-like atmosphere, floating elements' },
        { id: 'food', label: '🍔 Food Commercial', prompt: 'Mouth-watering commercial food photography, macro details, vibrant colors, studio ring light, condensation and steam, highly appetizing' },
        { id: 'noir', label: '🖤 Cine Noir', prompt: 'Black and white dramatic photography, film noir aesthetic, high contrast chiaroscuro lighting, deep shadows, classic 1940s vintage look, 35mm film' },
        { id: 'interior', label: '🏠 Diseño Interior', prompt: 'Architectural interior photography, natural sunlight streaming through windows, modern minimalist design, wide-angle lens, photorealistic 8k, Unreal Engine 5 rendering' },
        { id: 'pixelart', label: '🕹️ Pixel Art', prompt: '16-bit pixel art style, retro classic arcade aesthetic, vibrant palette, RPG isometric perspective, highly detailed sprite, nostalgic gaming' },
        { id: 'claymation', label: '🧸 Claymation', prompt: 'Cute 3D claymation style, stop-motion look, tilt-shift lens, plasticine textures, soft ambient lighting, pastel colors, Aardman animations aesthetic' },
        { id: 'motionblur', label: '🏎️ Motion Blur', prompt: 'High speed action photography, intense motion blur on background, sharp subject in focus, panning shot, cinematic speeding effect, sports photography' },
        { id: 'anime', label: '🌸 Anime Studio', prompt: 'High budget anime style, Studio Ghibli aesthetic, beautiful vibrant 2D illustration, lush detailed background, magical lighting, cell shaded, masterpiece' },
        { id: 'watercolor', label: '🎨 Acuarela', prompt: 'Beautiful watercolor painting, soft bleeding edge strokes, artistic, vibrant pastel colors, masterpiece, traditional media' }
    ];

    const toggleFilter = (filterPrompt) => {
        if (selectedFilters.includes(filterPrompt)) {
            setSelectedFilters(selectedFilters.filter(f => f !== filterPrompt));
        } else {
            setSelectedFilters([...selectedFilters, filterPrompt]);
        }
    };

    const [customPresets, setCustomPresets] = useState(() => {
        try { return JSON.parse(localStorage.getItem('godzilla_custom_presets') || '[]'); } catch { return []; }
    });
    const [ytLink, setYtLink] = useState('');
    const [refImage, setRefImage] = useState('');
    const [refiningTasks, setRefiningTasks] = useState({});
    
    // Purificador UI States
    const [purifyingStatus, setPurifyingStatus] = useState(null); // 'uploading' | 'processing' | null
    const [purifyPercent, setPurifyPercent] = useState(0);
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
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}?t=${Date.now()}`, {
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
                            alert("FFMPEG Error de Purificación: " + (stData.error || 'Unknown'));
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
            alert("Error de conexión con el Motor Local.");
        }
    };

    const refineWithGotSora = async (url, promptContext, optionIndex) => {
        setRefiningTasks(prev => ({ ...prev, [optionIndex]: true }));
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/refine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ imageUrl: url, prompt: promptContext })
            });
            const data = await res.json();
            
            if (data.status === 'processing' && data.job_id) {
                // Poll status
                const pollTimer = setInterval(async () => {
                    const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}?t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const stData = await stRes.json();
                    
                    if (stData.status === 'succeed') {
                        clearInterval(pollTimer);
                        setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
                        
                        // ADD side-by-side rather than replace
                        setSelectedDraft(prev => {
                            if (!prev) return prev;
                            const newOpts = [...prev.media_options];
                            const origOpt = newOpts[optionIndex];
                            
                            // Insertar la nueva inmediatamente después de la original
                            newOpts.splice(optionIndex + 1, 0, {
                                url: stData.result_url,
                                provider: origOpt.provider + ' + ✨ GotSora RefinedHQ',
                                isVideo: origOpt.isVideo
                            });
                            
                            const newState = { ...prev, media_options: newOpts };
                            setQueue(q => q.map(post => post.id === prev.id ? newState : post));
                            return newState;
                        });
                    } else if (stData.status === 'failed' || stData.status === 'error') {
                        clearInterval(pollTimer);
                        setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
                        alert("Error refinando con GotSora: " + (stData.error || "Falla desconocida"));
                    }
                }, 3000);
            }
        } catch (e) {
            console.error(e);
            setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
        }
    };

    const updateOption = (draftId, optIndex, changes) => {
        setQueue(q => q.map(post => {
            if (post.id === draftId) {
                const newOpts = [...post.media_options];
                newOpts[optIndex] = { ...newOpts[optIndex], ...changes };
                if (selectedDraft?.id === draftId) setSelectedDraft(prev => ({...prev, media_options: newOpts}));
                return { ...post, media_options: newOpts };
            }
            return post;
        }));
    };

    const triggerSingleRefine = async (opt, optIndex, draftId, promptText) => {
        updateOption(draftId, optIndex, { refinedUrl: 'loading' });
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/refine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ imageUrl: opt.url, prompt: promptText })
            });
            const data = await res.json();
            
            if (data.status === 'processing' && data.job_id) {
                const pollTimer = setInterval(async () => {
                    try {
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${encodeURIComponent(data.job_id)}?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const stData = await stRes.json();
                        
                        if (stData.status === 'succeed') {
                            clearInterval(pollTimer);
                            updateOption(draftId, optIndex, { refinedUrl: stData.result_url });
                        } else if (stData.status === 'failed' || stData.status === 'error') {
                            clearInterval(pollTimer);
                            updateOption(draftId, optIndex, { refinedUrl: 'error' });
                        }
                    } catch(e) {}
                }, 4000);
            } else {
                updateOption(draftId, optIndex, { refinedUrl: 'error' });
            }
        } catch(e) {
            updateOption(draftId, optIndex, { refinedUrl: 'error' });
        }
    };

    const triggerAutoRefine = async (optionsList, promptText, draftId) => {
        optionsList.forEach((opt, i) => {
             if (!opt.isVideo && !opt.provider.includes('GotSora')) {
                 triggerSingleRefine(opt, i, draftId, promptText);
             }
        });
    };

    const handleSavePreset = () => {
        if (!finalPrompt.trim()) return alert('Escribe un prompt primero para guardarlo.');
        const name = prompt('Dale un nombre corto a tu Preset (Ej: Estilo Pixar):');
        if (!name) return;
        const icon = prompt('Un emoji para identificarlo (Ej: 🎨):') || '📌';
        const newPreset = { icon, name, prompt: finalPrompt };
        const newPresets = [...customPresets, newPreset];
        setCustomPresets(newPresets);
        localStorage.setItem('godzilla_custom_presets', JSON.stringify(newPresets));
    };

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleMediaClick = (url) => {
        if (getYouTubeId(url)) return;
        if (url.startsWith('data:')) {
            try {
                const parts = url.split(';base64,');
                const contentType = parts[0].split(':')[1];
                const raw = window.atob(parts[1]);
                const rawLength = raw.length;
                const uInt8Array = new Uint8Array(rawLength);
                for (let i = 0; i < rawLength; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }
                const blob = new Blob([uInt8Array], { type: contentType });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            } catch(e) {
                console.error("Error al abrir data URI", e);
            }
        } else {
            window.open(url, '_blank');
        }
    };
    const [builderData, setBuilderData] = useState({ 
        model: 'Veo 3.1 - Fast',
        aspect_ratio: '16:9',
        duracion: 'x1',
        negativo: ''
    });

    const [elitePrompts, setElitePrompts] = useState([
        "Cinematic FPV drone shot, flying through a hyper-realistic neo-tokyo corporate office at midnight...",
        "Extreme macro close-up of a glowing glowing server rack cable snapping, sparks flying in explosive super slow motion..."
    ]);

    useEffect(() => {
        fetchQueue();
        fetchElitePrompts();

        // ═══════════════════════════════════════════════════════════════════════
        // SSE: LIVE SYNC PARA TAREAS (Arte ↔ Calendario)
        // ═══════════════════════════════════════════════════════════════════════
        const token = localStorage.getItem('adminToken');
        const API = import.meta.env.DEV ? 'http://localhost:3000' : '';
        const evtSource = new EventSource(`${API}/api/studio/tasks/stream?token=${token}`);

        evtSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'CONNECTED') {
                    console.log("[SSE Studio] Conectado a live sync.");
                } else if (data.type === 'CREATE' || data.type === 'UPDATE') {
                    const incomingTask = data.task;
                    const mapped = {
                        id: incomingTask.id,
                        status: incomingTask.status,
                        scheduled_for: incomingTask.ig_publish_date,
                        caption: incomingTask.title,
                        visual_prompt: incomingTask.prompt,
                        media_options: typeof incomingTask.media_payload === 'string' ? JSON.parse(incomingTask.media_payload) : (incomingTask.media_payload || [])
                    };

                    setQueue(prevQueue => {
                        const exists = prevQueue.find(t => t.id === mapped.id);
                        if (exists) {
                            return prevQueue.map(t => t.id === mapped.id ? mapped : t);
                        } else {
                            return [mapped, ...prevQueue];
                        }
                    });
                } else if (data.type === 'DELETE') {
                    setQueue(prevQueue => prevQueue.filter(t => t.id !== data.taskId));
                }
            } catch (e) {
                console.error("Error parseando SSE Studio:", e);
            }
        };

        return () => {
            evtSource.close();
        };
    }, []);

    const fetchElitePrompts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/elite-prompts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.prompts?.length > 0) {
                setElitePrompts(data.prompts);
            }
        } catch (e) {
            console.error('Error fetching elite prompts:', e);
        }
    };

    const handleSendChatMessage = async (val) => {
        if (!val.trim()) return;
        setScriptChatInput('');
        const newUserMsg = { role: 'user', text: val };
        setScriptChatHistory(h => [...h, newUserMsg]);
        
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${'' || ''}/api/studio/script-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: val, chatHistory: scriptChatHistory })
            });
            const data = await response.json();
            if (data.success) {
                setScriptChatHistory(h => [...h, { role: 'ai', text: data.text }]);
                if (setSelectedDraft) {
                    setSelectedDraft(prev => prev ? {...prev, caption: data.text} : prev);
                }
            } else {
                setScriptChatHistory(h => [...h, { role: 'ai', text: "Error de conexión con Gemini." }]);
            }
        } catch (e) {
            console.error(e);
            setScriptChatHistory(h => [...h, { role: 'ai', text: "Fallo al contactar IA." }]);
        }
    };

    const fetchQueue = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const mapped = data.tasks.map(t => ({
                    id: t.id,
                    status: t.status,
                    scheduled_for: t.ig_publish_date,
                    caption: t.title,
                    visual_prompt: t.prompt,
                    media_options: typeof t.media_payload === 'string' ? JSON.parse(t.media_payload) : (t.media_payload || [])
                }));
                if (mapped.length === 0) {
                    setQueue([{ id: 999, status: 'cockers_review', scheduled_for: '2026-04-05T10:00:00Z', caption: '🚀 El boca a boca no te va a pagar la nómina...', visual_prompt: 'Cinematic 35mm wide shot, modern corporate office...', media_options: [] }]);
                } else {
                    setQueue(mapped);
                }
            }
        } catch (e) {
            console.error('Error', e);
        }
        setIsLoading(false);
    };

    const handleAction = async (opt, actionType) => {
        let msg = '';
        let newStatus = '';
        if (actionType === 'review') {
            msg = `¿Enviar ${opt.provider} a revisión al Jefe/CM?`;
            newStatus = 'pending_cm_approval';
        } else if (actionType === 'approve') {
            msg = `¿Aprobar renderizado de ${opt.provider} y enviarlo al Calendario?`;
            newStatus = 'approved';
        } else if (actionType === 'reject') {
            msg = `¿Devolver este contenido a Cockers (Alex) para corrección?`;
            newStatus = 'rejected';
        } else if (actionType === 'delete') {
            msg = `¿Estás seguro de eliminar este contenido?`;
            newStatus = 'deleted'; // We can just set status deleted so it hides
        }

        if (!window.confirm(msg)) return;
        
        try {
            const token = localStorage.getItem('adminToken');
            if (selectedDraft.id === 999) {
                // Modo prototipo
                alert(`✅ Acción simulada: Contenido marcado como ${newStatus}.`);
                setQueue(q => q.filter(p => p.id !== selectedDraft.id));
                setSelectedDraft(null);
                return;
            }

            const res = await fetch(`${'' || ''}/api/studio/tasks/${selectedDraft.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    status: newStatus,
                    media_payload: [{ url: opt.url, provider: opt.provider, isVideo: opt.isVideo }]
                })
            });
            
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Fallo API');

            alert(`✅ Exito: El contenido se movió a estado: ${newStatus}.`);
            setQueue(q => q.map(t => t.id === selectedDraft?.id ? { ...t, status: newStatus } : t));
            if (actionType !== 'reject' && actionType !== 'delete') {
                setSelectedDraft(null);
            }
        } catch (error) {
            console.error(error);
            alert(`⚠️ Error al procesar: ${error.message}`);
        }
    };

    const simulateAIGeneration = async () => {
        setRenderingAI(true);
        setRenderProgress(0);
        try {
            const rawPrompt = finalPrompt || selectedDraft?.visual_prompt || 'cyberpunk cinematic city';
            const cleanPrompt = rawPrompt.replace(/\[\/?.*?]/g, '').trim();
            const token = localStorage.getItem('adminToken');

            // FEEDBACK LEARNING (Alimentar a Goyi si hubo cambios iterativos)
            if (finalPrompt && selectedDraft?.visual_prompt && finalPrompt !== selectedDraft.visual_prompt) {
                fetch(`${'' || ''}/api/studio/learning`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        original_prompt: selectedDraft.visual_prompt,
                        improved_prompt: finalPrompt,
                        context_type: 'cockers_regenerate'
                    })
                }).catch(e => console.error("Error saving learning:", e));
            }
            
            const guardarDraftFinal = (options, rPrompt) => {
                let currentId;
                if (selectedDraft) {
                    currentId = selectedDraft.id;
                    setQueue(q => q.map(post => post.id === selectedDraft.id ? { ...post, media_options: options } : post));
                    setSelectedDraft(prev => ({ ...prev, media_options: options }));
                } else {
                    currentId = Date.now();
                    setSelectedDraft({
                        id: currentId,
                        status: 'generated',
                        caption: '',
                        visual_prompt: rPrompt,
                        media_options: options
                    });
                }
                return currentId;
            };

            // Motores a invocar - TODOS los modelos confirmados (Sin GotSora Inicial)
            const enginesToRun = genMode === 'video'
                ? ['Veo 3.1', 'Veo 3.1 Fast', 'Higgsfield Cosmos', 'Higgsfield Fast']
                : ['Imagen 4 Ultra', 'Imagen 4 Pro', 'Imagen 4 Fast', 'Gemini 3 Pro Image', 'Gemini 3.1 Flash Image', 'GotSora (T2I Local)'];
            
            // Re-armar el prompt base si tiene filtros
            const promptAmentado = selectedFilters.length > 0 
                ? `${finalPrompt}. ${selectedFilters.join(', ')}`
                : finalPrompt;
            
            const isVideoMode = genMode === 'video';

            const promises = [];
            for (let i = 0; i < enginesToRun.length; i++) {
                const engineName = enginesToRun[i];
                const updatedConfig = { ...builderData, refImage: refImage };
                
                promises.push((async () => {
                    try {
                        const resFetch = await fetch(`${'' || ''}/api/studio/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ 
                                prompt: promptAmentado, 
                                mode: isVideoMode ? 'video' : 'imagen', 
                                engine: engineName, 
                                config: updatedConfig 
                            })
                        });
                        let data = await resFetch.json();
                        if (!resFetch.ok) throw new Error(data.error || 'Server error');
                        return { engineName, data, isVideoMode };
                    } catch (e) {
                        console.error("Error for engine", engineName, e);
                        return { engineName, data: { status: 'error', error: e.message }, isVideoMode };
                    }
                })());
                await new Promise(r => setTimeout(r, 800)); // Stagger each request by 800ms to avoid 429 Resource Exhausted on Google GenAI
            }
                


            const initialResults = await Promise.allSettled(promises);
            let finalOptions = [];
            let tasksToPoll = [];
            
            // Repartir síncronos y asíncronos
            initialResults.forEach(res => {
                if (res.status === 'fulfilled') {
                    const { engineName, data, isVideoMode } = res.value;
                    if (data.status === 'succeed' && data.result_url) {
                        if (Array.isArray(data.result_url)) {
                            data.result_url.forEach((url, i) => {
                                finalOptions.push({ provider: `${engineName} (Opción ${String.fromCharCode(65+i)})`, url: url, isVideo: isVideoMode || !!data.isVideo });
                            });
                        } else {
                            finalOptions.push({ provider: engineName, url: data.result_url, isVideo: isVideoMode || !!data.isVideo });
                        }
                    } else if (data.status === 'processing' && data.job_id) {
                        tasksToPoll.push({ engineName, job_id: data.job_id, progress: 0, done: false, isVideoMode });
                    } else if (data.status === 'error') {
                        finalOptions.push({ provider: engineName + ' ⚠️ Failed (Network/500)', url: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=700&auto=format&fit=crop', isVideo: isVideoMode });
                    }
                }
            });

            if (tasksToPoll.length === 0) {
                 if(finalOptions.length === 0){
                     finalOptions.push({ provider: 'Simulación (Fallback LOCAL)', url: '/assets/kaiju_cheems.png', isVideo: false });
                 }
                 const newDraftId = guardarDraftFinal(finalOptions, rawPrompt);
                 setRenderingAI(false);
                 return;
            }

            // Iniciar Polling de Matriz (Monitorear a las 3 IAs simultáneamente)
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                let allDone = true;
                
                for (let i = 0; i < tasksToPoll.length; i++) {
                    const task = tasksToPoll[i];
                    if (task.done) continue; 
                    
                    try {
                        const encodedJobId = encodeURIComponent(task.job_id);
                        const statusRes = await fetch(`${'' || ''}/api/studio/status/${encodedJobId}?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (!statusRes.ok) {
                             const textObj = await statusRes.text();
                             if (textObj.includes('<!DOCTYPE')) throw new Error('Servidor Web retornó HTML (Posible 404 o 500 fatal).');
                             const dataObj = JSON.parse(textObj);
                             throw new Error(dataObj.error || `HTTP ${statusRes.status}`);
                        }
                        
                        const statusData = await statusRes.json();
                        
                        task.progress = statusData.progress || task.progress + 10;
                        
                        if (statusData.status === 'succeed') {
                             task.done = true;
                             if(statusData.result_url) {
                                 if (Array.isArray(statusData.result_url)) {
                                     statusData.result_url.forEach((url, i) => {
                                         finalOptions.push({ provider: `${task.engineName} (Opción ${String.fromCharCode(65+i)})`, url: url, isVideo: task.isVideoMode || !!statusData.isVideo });
                                     });
                                 } else {
                                     finalOptions.push({ provider: task.engineName, url: statusData.result_url, isVideo: task.isVideoMode || !!statusData.isVideo });
                                 }
                             }
                        } else if (statusData.status === 'failed') {
                             finalOptions.push({ provider: task.engineName + ' ⚠️ Failed', url: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=700&auto=format&fit=crop', isVideo: task.isVideoMode });
                             task.done = true; 
                        } else {
                             allDone = false; 
                        }
                    } catch (e) {
                        console.error(`Poller fallando en node ${task.engineName}`);
                        allDone = false;
                    }
                }
                
                let totalProgress = tasksToPoll.reduce((acc, t) => acc + (t.progress || 0), 0);
                setRenderProgress(Math.floor(totalProgress / tasksToPoll.length));
                if (allDone || attempts > 150) { // Timeout ampliado a 15 min para renders de Video pesados
                    clearInterval(pollInterval);
                    if(finalOptions.length === 0){
                         finalOptions.push({ provider: 'Simulación de Reserva', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80', isVideo: false });
                    }
                    const newDraftId = guardarDraftFinal(finalOptions, rawPrompt);
                    setRenderingAI(false);
                }
            }, 6000);
        } catch (error) {
            console.error('Error Live Gen', error);
            alert(`Error de Live Mode: ${error.message}`);
            setRenderingAI(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-neutral-400 font-bold flex items-center justify-center h-full">Iniciando Estudio IA...</div>;

    // ─── Injected CSS for ken-burns, scanline sweep, glow pulse ───
    const GALLERY_CSS = `
        @keyframes kenBurns {
            0%   { transform: scale(1)    translateX(0)    translateY(0); }
            25%  { transform: scale(1.06) translateX(-1%)  translateY(-1%); }
            50%  { transform: scale(1.1)  translateX(1%)   translateY(1%); }
            75%  { transform: scale(1.06) translateX(-0.5%) translateY(0.5%); }
            100% { transform: scale(1)    translateX(0)    translateY(0); }
        }
        @keyframes scanSweep {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes glowPulse {
            0%, 100% { box-shadow: 0 0 0px rgba(204,0,0,0); }
            50%       { box-shadow: 0 0 24px rgba(204,0,0,0.5), 0 0 48px rgba(204,0,0,0.2); }
        }
        .gallery-img { animation: kenBurns 14s ease-in-out infinite; }
        .gallery-card:hover .gallery-img { animation-play-state: paused; }
        .gallery-card.featured { animation: glowPulse 3s ease-in-out infinite; }
        .scan-overlay {
            position: absolute; inset: 0; z-index: 15; pointer-events: none;
            background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%);
            background-size: 200% 100%;
            animation: scanSweep 3s linear infinite;
        }
        @keyframes floatBob {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-8px); }
        }
        .float-badge { animation: floatBob 4s ease-in-out infinite; }
        @keyframes ticker {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: ticker 22s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
    `;

    // ─── TiltCard: 3-D mouse-tracking card ───
    const TiltCard = ({ item, idx }) => {
        const cardRef = useRef(null);
        const rotX = useMotionValue(0);
        const rotY = useMotionValue(0);
        const springX = useSpring(rotX, { stiffness: 200, damping: 20 });
        const springY = useSpring(rotY, { stiffness: 200, damping: 20 });

        const handleMouse = (e) => {
            const card = cardRef.current;
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top  + rect.height / 2;
            rotY.set(((e.clientX - cx) / rect.width)  * 18);
            rotX.set(((cy - e.clientY) / rect.height) * 12);
        };
        const resetTilt = () => { rotX.set(0); rotY.set(0); };

        const isFeatured = idx % 4 === 0;

        return (
            <motion.div
                ref={cardRef}
                key={idx}
                initial={{ opacity: 0, y: 40, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
                onMouseMove={handleMouse}
                onMouseLeave={resetTilt}
                className={`gallery-card relative group rounded-2xl overflow-hidden border border-white/5 hover:border-[#CC0000]/60 transition-colors shadow-xl shadow-black/60${isFeatured ? ' featured' : ''}`}
            >
                {/* Scan sweep shimmer */}
                <div className="scan-overlay pointer-events-none" />
                {/* Shimmer skeleton */}
                <div className="absolute inset-0 bg-neutral-900 animate-pulse pointer-events-none" />
                <img
                    src={item.img}
                    alt={item.tag}
                    loading="lazy"
                    className="gallery-img relative z-10 w-full h-auto object-cover block pointer-events-none"
                />
                {/* Dark gradient */}
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

                {/* Floating top badge */}
                <div className="float-badge absolute top-3 right-3 z-30 pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-neutral-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isFeatured ? 'bg-[#CC0000] animate-pulse' : 'bg-emerald-400'}`}/>
                        {item.model}
                    </span>
                </div>

                {/* Bottom overlay — always visible slightly, full on hover */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="absolute bottom-0 left-0 right-0 z-30 p-4"
                >
                    <p className="text-white font-bold text-sm mb-0.5">{item.tag}</p>
                    <p className="text-neutral-400 text-[10px] line-clamp-2 leading-relaxed mb-3">{item.prompt}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setFinalPrompt(item.prompt); }} className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-emerald-600/50 backdrop-blur-xl border border-white/10 hover:border-emerald-500/50 rounded-full py-1.5 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Usar Prompt
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleFilter(item.prompt); }} className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-[#CC0000]/50 backdrop-blur-xl border border-white/10 hover:border-[#CC0000]/50 rounded-full py-1.5 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            + Filtro
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    // Componente de Botón de Aspect Ratio (inspirado en la referencia)
    const AspectRatioButton = ({ ratio, label, active }) => (
        <button 
            onClick={() => setBuilderData({...builderData, aspect_ratio: label})}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-[60px] h-[60px] ${active ? 'bg-neutral-800 border-neutral-600' : 'bg-transparent hover:bg-neutral-900 border-transparent text-neutral-400'} border`}
        >
            <div className={`mb-1 border-2 border-current rounded-sm ${label === '16:9' ? 'w-6 h-3.5' : label === '9:16' ? 'w-3.5 h-6' : label === '1:1' ? 'w-5 h-5' : label === '4:3' ? 'w-5 h-4' : 'w-4 h-5'}`}></div>
            <span className="text-[10px] font-bold mt-1">{label}</span>
        </button>
    );

    const MultiplierButton = ({ label, active }) => (
        <button 
            onClick={() => setBuilderData({...builderData, duracion: label})}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${active ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex h-full bg-[#0a0a09] text-white overflow-hidden relative">
            
            {/* LEFT SIDEBAR: Panel de Parámetros (Estilo Kling / Flow) */}
            <div className="w-[380px] bg-[#0f0f0e] border-r border-[#222] flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar z-20">
                
                {/* Header Fijo: Motores Flash Activos */}
                <div className="p-4 pt-6 shrink-0 flex items-center justify-center">
                    <div className="bg-[#1a1a19] px-4 py-2 rounded-full flex items-center justify-center w-full shadow-inner border border-neutral-800/50">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#CC0000] flex items-center gap-2">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                             AI Studio: {genMode === 'video' ? 'Video Generativo' : 'Imágenes Alta Fidelidad'}
                        </span>
                    </div>
                </div>

                {/* TOGGLE IMAGEN / VIDEO */}
                <div className="px-4 pb-2 shrink-0">
                    <div className="flex bg-[#1a1a19] rounded-2xl p-1 border border-neutral-800 shadow-inner">
                        <button
                            onClick={() => setGenMode('imagen')}
                            className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${genMode === 'imagen' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            Imagen
                        </button>
                        <button
                            onClick={() => setGenMode('video')}
                            className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 ${genMode === 'video' ? 'bg-[#CC0000] text-white shadow-[0_0_15px_rgba(204,0,0,0.4)]' : 'text-neutral-500 hover:text-[#CC0000]'}`}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
                            Video Veo
                        </button>
                    </div>
                    {genMode === 'video' && (
                        <div className="mt-2 flex items-center gap-1.5 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#CC0000] animate-pulse"/>
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Veo 3.1 · Higgsfield Cosmos — Plan Ultra</span>
                        </div>
                    )}
                </div>

                {/* Área de Prompt */}
                <div className="px-5 py-2 flex flex-col flex-1 shrink-0">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">Prompt</p>
                    <textarea 
                        value={finalPrompt} 
                        onChange={e => setFinalPrompt(e.target.value)} 
                        placeholder={genMode === 'video' ? "¿Qué quieres animar o crear hoy?" : "Describe la imagen perfecta..."}
                        className="w-full h-[140px] bg-transparent border-none text-white/90 focus:ring-0 p-0 text-md font-light placeholder-neutral-600 outline-none resize-none leading-relaxed"
                    />
                    
                    {/* Suggested Presets Strip (Higgsfield Style) */}
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2 mt-2">
                        {[
                            { icon: '🎥', name: 'Cinematic', prompt: 'Cinematic dolly shot, dramatic lighting, vivid colors, 35mm film, hyper-realistic, 8k resolution' },
                            { icon: '📸', name: 'Macro Product', prompt: 'Commercial macro product shot, f/2.8 aperture, soft studio lighting, blurred bokeh background, ultra detailed' },
                            { icon: '👽', name: 'Cyberpunk', prompt: 'Cyberpunk aesthetic, neon purple and blue lighting, rainy atmosphere, blade runner reflections, unreal engine 5 render' },
                            { icon: '🎞️', name: 'Vintage 90s', prompt: '90s analog film look, light grain, warm faded colors, vintage aesthetic, polaroid style' },
                            { icon: '🦅', name: 'Drone Epic', prompt: 'Aerial drone shot, epic dramatic landscape, golden hour lighting, national geographic photography' },
                            ...customPresets
                        ].map((preset, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setFinalPrompt(preset.prompt)}
                                className="shrink-0 bg-[#1a1a19] hover:bg-[#CC0000]/20 border border-neutral-800 hover:border-[#CC0000]/50 text-neutral-400 hover:text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                            >
                                <span>{preset.icon}</span> {preset.name}
                            </button>
                        ))}
                        <button 
                            onClick={handleSavePreset}
                            className="shrink-0 bg-transparent hover:bg-neutral-800 border border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-500 hover:text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                        >
                            <span>+</span> Añadir
                        </button>
                    </div>

                    {/* Floating Settings Widget (Estilo Luma Dream Machine) */}
                    <div className="bg-[#141413] border border-neutral-800 rounded-3xl p-4 mt-4 shadow-2xl relative overflow-hidden group">
                        
                        {/* Selector Interno (Fotogramas vs Ingredientes vs Limpiador) */}
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
                        {activeTab === 'Fotogramas' ? (
                            <>
                                <div className="flex items-center justify-between gap-1 mb-4">
                                    <AspectRatioButton label="16:9" active={builderData.aspect_ratio === '16:9'} />
                                    <AspectRatioButton label="4:3" active={builderData.aspect_ratio === '4:3'} />
                                    <AspectRatioButton label="1:1" active={builderData.aspect_ratio === '1:1'} />
                                    <AspectRatioButton label="3:4" active={builderData.aspect_ratio === '3:4'} />
                                    <AspectRatioButton label="9:16" active={builderData.aspect_ratio === '9:16'} />
                                </div>
                                
                                {/* Estilos Fotográficos / Filtros */}
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2 flex items-center justify-between">
                                        Filtros de Estilo
                                        <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{selectedFilters.length} activos</span>
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PHOTO_FILTERS.map(filter => {
                                            const isActive = selectedFilters.includes(filter.prompt);
                                            return (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => toggleFilter(filter.prompt)}
                                                    className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border flex items-center gap-1.5 ${isActive ? 'bg-[#CC0000] text-white border-[#CC0000] shadow-[0_0_10px_rgba(204,0,0,0.5)]' : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-white'}`}
                                                >
                                                    {filter.label}
                                                    {isActive && <span className="text-[7px] bg-red-900/40 hover:bg-black/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>}
                                                </button>
                                            );
                                        })}
                                        {/* Píldoras especiales comunitarias inyectadas desde la galería */}
                                        {selectedFilters.map(sf => {
                                            if (PHOTO_FILTERS.find(pf => pf.prompt === sf)) return null;
                                            const comm = COMMUNITY_GALLERY_POOL.find(c => c.prompt === sf);
                                            const label = comm ? comm.tag : 'Estilo Mágico';
                                            return (
                                                <button
                                                    key={sf}
                                                    onClick={() => toggleFilter(sf)}
                                                    className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] flex items-center gap-1.5`}
                                                    title="Filtro seleccionado de la Galería Comunitaria"
                                                >
                                                    ✨ {label}
                                                    <span className="text-[7px] bg-indigo-900/40 hover:bg-black/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : activeTab === 'Ingredientes' ? (
                            <div className="flex flex-col gap-2 mb-4">
                                {refImage ? (
                                    <div className="relative group rounded-2xl overflow-hidden border-2 border-[#CC0000] shadow-[0_0_15px_rgba(204,0,0,0.3)]">
                                        <img src={refImage} alt="Ingrediente" className="w-full h-[120px] object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <span className="text-white text-[10px] font-bold uppercase tracking-widest text-center px-2">Ingrediente <br/>Digerido</span>
                                            <button onClick={() => setRefImage('')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-full text-[9px] uppercase">Quitar/Cambiar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center flex-col justify-center h-[120px] border-2 border-dashed border-neutral-800 rounded-2xl hover:border-[#CC0000] hover:bg-[#CC0000]/10 transition-colors cursor-pointer relative">
                                        <span className="text-2xl mb-1">🧩</span>
                                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">Añadir Ingrediente</span>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e)=>{
                                            if(e.target.files && e.target.files[0]){
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setRefImage(ev.target.result);
                                                    e.target.value = null; 
                                                };
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }}/>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col mb-4 p-4 border border-[#CC0000]/30 bg-[#CC0000]/5 rounded-2xl">
                                <p className="text-[10px] text-neutral-400 font-medium mb-3 leading-relaxed">Sube un video manchado (Ej: Kling) y el Motor lo limpiará con <span className="font-bold text-white">-crf 18 Lossless</span>.</p>
                                
                                {purifyingStatus ? (
                                    <div className="flex items-center justify-center p-6 border border-neutral-800 rounded-xl bg-black">
                                       <div className="flex flex-col items-center gap-2 animate-pulse">
                                          <div className="w-5 h-5 rounded-full border-t-2 border-[#CC0000] animate-spin"></div>
                                          <span className="text-[10px] text-white font-bold uppercase tracking-widest">{purifyingStatus === 'uploading' ? 'Subiendo 300MB/s...' : `Destruyendo Marca... ${purifyPercent}%`}</span>
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
                        )}



                        {/* YouTube Video URL Input */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <label className="text-[10px] font-black text-[#CC0000] uppercase mb-2 flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M9.996,15.005V8.995L15.266,12L9.996,15.005z"/></svg> Vincular YouTube (Final)</label>
                            <input type="url" value={ytLink} onChange={e => setYtLink(e.target.value)} placeholder="Ej: https://youtu.be/..." className="w-full bg-[#111110] border border-neutral-800 hover:border-neutral-600 outline-none text-xs font-bold text-white rounded-2xl p-4 transition-colors" />
                            <p className="text-[9px] text-neutral-500 mt-2 leading-relaxed">Pega URL Oculto. Al "Generar", este video se vinculará a la tarea actual de la Admin en vez del motor local.</p>
                        </div>
                    </div>
                </div>

                {/* Footer del Sidebar (Boton Prominente e Info) */}
                <div className="p-4 border-t border-[#222] bg-[#0a0a09] shrink-0">
                    <button 
                        onClick={() => simulateAIGeneration()}
                        disabled={renderingAI || (!finalPrompt.trim() && !ytLink.trim())}
                        className="w-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-widest text-sm py-4 rounded-full flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                    >
                        {renderingAI ? 'PROCESANDO...' : (selectedDraft?.media_options?.length > 0 ? 'RE-GENERAR VARIANTES' : 'GENERAR →')}
                        {selectedDraft?.media_options?.length > 0 && !renderingAI && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#CC0000]/10 backdrop-blur-md p-2 text-[9px] text-[#CC0000] border border-[#CC0000]/50 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                Tip: Edita el prompt y forzarás la re-creación quemando saldo.
                            </span>
                        )}
                    </button>
                    {refImage && (
                        <div className="mt-4 flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-2 px-3">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase truncate max-w-[200px]">Ref Image attached</span>
                            <img src={refImage} className="w-6 h-6 rounded-md object-cover border border-neutral-700" alt="ref" />
                            <button onClick={()=>setRefImage('')} className="text-neutral-500 hover:text-[#CC0000] text-lg font-black ml-2 mb-1">×</button>
                        </div>
                    )}
                    </div>
                </div>

                {/* Modal de Asistente de Guiones / Copywriting (Shared) */}
                {showScriptGen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-2xl h-[70vh] bg-[#111111] border border-[#CC0000]/30 shadow-[0_0_50px_rgba(204,0,0,0.2)] rounded-3xl overflow-hidden flex flex-col relative transform scale-100 transition-all">
                            <div className="bg-[#CC0000]/10 border-b border-red-900/30 p-4 shrink-0 flex justify-between items-center relative">
                                <div>
                                    <h3 className="text-[#CC0000] font-black uppercase text-sm tracking-widest flex items-center gap-2">✨ Redactor IA</h3>
                                    <p className="text-[10px] text-neutral-400 font-bold mt-1 uppercase">Conversa y obtén el copy definitivo</p>
                                </div>
                                <button onClick={() => setShowScriptGen(false)} className="text-white hover:text-[#CC0000] font-black text-xl w-8 h-8 flex items-center justify-center bg-black/30 backdrop-blur-md shadow-md hover:bg-[#CC0000]/20 rounded-full outline-none">×</button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#010101]">
                                {scriptChatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`p-4 rounded-xl max-w-[85%] text-sm font-bold shadow-lg leading-relaxed ${msg.role === 'ai' ? 'bg-[#1a1a1a] text-neutral-300 border border-neutral-800 rounded-tl-sm' : 'bg-[#CC0000]/20 border border-[#CC0000]/40 text-white rounded-tr-sm'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="p-4 bg-black/60 backdrop-blur border-t border-red-900/30 flex gap-2 shrink-0">
                                <input 
                                    type="text" 
                                    value={scriptChatInput} 
                                    onChange={e => setScriptChatInput(e.target.value)} 
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') handleSendChatMessage(scriptChatInput);
                                    }} 
                                    placeholder="Ej: Hazme un guion agresivo para vender software..." 
                                    className="flex-1 bg-black/50 backdrop-blur-md border hover:border-[#CC0000]/50 shadow-inner text-white focus:bg-[#CC0000]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#CC0000] border-red-900/30" 
                                />
                                <button 
                                    onClick={() => handleSendChatMessage(scriptChatInput)} 
                                    className="bg-[#222] hover:bg-gradient-to-r from-[#CC0000] to-[#880000] text-white font-black uppercase px-6 rounded-xl text-xs transition-colors shadow-lg"
                                >
                                    Enviar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* RIGHT MAIN CANVAS: Resultados y Feed (Estilo Kling) */}
            <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-auto custom-scrollbar">
                
                {/* Cabecera del Lienzo */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-[#000000cc] to-transparent">
                    <h2 className="text-xl font-bold tracking-tight text-neutral-300">
                        {renderingAI ? (
                            <span className="flex items-center gap-2 animate-pulse"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Engine Working</span>
                        ) : 'Lienzo de Creación'}
                    </h2>
                    
                    <div className="flex gap-3">
                        <button onClick={() => {
                            const pendings = queue.filter(q => q.status !== 'pending_cm_approval' && q.status !== 'rejected' && q.status !== 'approved');
                            if(pendings.length > 0) setSelectedDraft(pendings[0]);
                            else alert('No hay scripts pendientes');
                        }} className="text-xs font-bold text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-full transition-colors flex items-center gap-2 bg-[#111]">
                            📋 Pendientes ({queue.filter(q => q.status !== 'pending_cm_approval' && q.status !== 'rejected' && q.status !== 'approved').length})
                        </button>
                        
                        {canSeeAll && (
                            <button onClick={() => setShowOutbox(true)} className="text-xs font-bold text-[#CC0000] hover:bg-[#CC0000] hover:text-white border border-[#CC0000]/50 px-4 py-2 rounded-full transition-colors flex items-center gap-2 bg-[#CC0000]/10 shadow-[0_0_10px_rgba(204,0,0,0.2)]">
                                📤 Enviados y Devueltos ({queue.filter(q => q.status === 'pending_cm_approval' || q.status === 'rejected').length})
                            </button>
                        )}
                    </div>
                </div>

                {/* MODAL OUTBOX */}
                {showOutbox && (() => {
                    const outboxQueue = queue.filter(q => {
                        if (outboxTab === 'enviadas') return ['pending_cm_approval', 'approved', 'rejected'].includes(q.status);
                        if (outboxTab === 'aprobadas') return q.status === 'approved';
                        if (outboxTab === 'correcciones') return q.status === 'rejected';
                        return false;
                    });
                    
                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-4xl max-h-[85vh] bg-[#111111] border border-neutral-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col relative">
                            <div className="bg-[#1a1a1a] border-b border-neutral-800 p-5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">📤 Bandeja de Salida (Arte)</h3>
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => setOutboxTab('enviadas')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border ${outboxTab === 'enviadas' ? 'bg-[#CC0000] text-white border-[#CC0000]' : 'bg-transparent text-neutral-500 border-neutral-700 hover:text-white'}`}>Enviadas</button>
                                        <button onClick={() => setOutboxTab('aprobadas')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border ${outboxTab === 'aprobadas' ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-transparent text-neutral-500 border-neutral-700 hover:text-white'}`}>Aprobadas</button>
                                        <button onClick={() => setOutboxTab('correcciones')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border ${outboxTab === 'correcciones' ? 'bg-[#CC0000] text-white border-[#CC0000]' : 'bg-transparent text-neutral-500 border-neutral-700 hover:text-white'}`}>Correcciones</button>
                                    </div>
                                </div>
                                <button onClick={() => setShowOutbox(false)} className="text-white hover:text-[#CC0000] text-xl font-black w-8 h-8 self-start">×</button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
                                {outboxQueue.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-10 opacity-50">
                                        <span className="text-4xl mb-4">📭</span>
                                        <p className="text-white font-bold tracking-widest text-sm">Tu bandeja está vacía.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {outboxQueue.map(task => (
                                            <div key={task.id} className={`border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden ${task.status === 'rejected' ? 'bg-[#CC0000]/5 border-[#CC0000]/40' : task.status === 'approved' ? 'bg-yellow-900/10 border-yellow-500/40' : 'bg-neutral-900 border-neutral-800'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${task.status === 'rejected' ? 'bg-[#CC0000] text-white' : task.status === 'approved' ? 'bg-yellow-600 text-white' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        {task.status === 'rejected' ? '❌ DEVUELTO' : task.status === 'approved' ? '🌟 APROBADA' : '⏳ EN REVISIÓN'}
                                                    </span>
                                                </div>
                                                
                                                {task.media_options && task.media_options[0] && (
                                                    task.media_options[0].url.includes('.mp4') || task.media_options[0].url.includes('.webm') ? (
                                                        <video src={task.media_options[0].url} className="w-full h-32 object-cover rounded-lg border border-neutral-800" autoPlay loop muted playsInline />
                                                    ) : (
                                                        <img src={task.media_options[0].url} alt="asset" className="w-full h-32 object-cover rounded-lg border border-neutral-800" />
                                                    )
                                                )}
                                                
                                                <p className="text-xs text-neutral-300 line-clamp-2">{task.caption || task.visual_prompt}</p>
                                                
                                                <div className="flex justify-end gap-2 mt-auto pt-2 border-t border-neutral-800/50">
                                                    {task.status === 'pending_cm_approval' && (
                                                        <button 
                                                            onClick={() => { setSelectedDraft(task); handleAction(task.media_options[0] || {}, 'delete'); }} 
                                                            className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-3 py-1.5 rounded"
                                                        >
                                                            Eliminar Tarea
                                                        </button>
                                                    )}
                                                    {task.status === 'rejected' && (
                                                        <button 
                                                            onClick={() => { setSelectedDraft(task); setShowOutbox(false); }} 
                                                            className="text-[10px] bg-[#CC0000] hover:bg-red-800 text-white font-bold px-4 py-1.5 rounded shadow-[0_0_10px_rgba(204,0,0,0.3)]"
                                                        >
                                                            Cargar al Canvas
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* Si no hay drafts ni generación, Mostramos el "Explore Gallery" — DIVIDIDO por modo */}
                {!renderingAI && (!selectedDraft || !selectedDraft.media_options?.length) && (
                    <motion.div 
                        key={genMode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 overflow-auto custom-scrollbar"
                    >
                        {/* Inject dynamic CSS */}
                        <style>{GALLERY_CSS}</style>

                        {/* Ambient background orbs */}
                        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#CC0000]/8 rounded-full blur-[120px] animate-pulse" />
                            <div className="absolute top-1/2 -right-48 w-[400px] h-[400px] bg-indigo-900/12 rounded-full blur-[100px]" style={{animation:'floatBob 8s ease-in-out infinite'}} />
                            <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-violet-900/10 rounded-full blur-[80px]" style={{animation:'floatBob 12s ease-in-out infinite reverse'}} />
                        </div>

                        {/* Sticky Header */}
                        <div className="sticky top-0 z-40 bg-gradient-to-b from-[#0a0a09] via-[#0a0a09]/95 to-transparent pt-6 pb-6 px-8">
                            <div className="flex items-center justify-between max-w-5xl mx-auto">
                                <div>
                                    <p className="text-[9px] font-black text-[#CC0000] uppercase tracking-[0.3em] mb-0.5">
                                        Godzilla Studio AI — Motores Flash
                                    </p>
                                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                        Director's Gallery
                                        <span className="text-[9px] font-black bg-[#CC0000]/20 text-[#CC0000] border border-[#CC0000]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            LIVE
                                        </span>
                                    </h1>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap justify-end">
                                    <button 
                                        onClick={fetchDynamicInspiration}
                                        disabled={isFetchingInspiration}
                                        className="group bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        <span className={isFetchingInspiration ? "animate-spin" : ""}>✨</span>
                                        {isFetchingInspiration ? 'Generando...' : 'Jalar Inspiración Google'}
                                    </button>
                                    <button 
                                        onClick={() => setShowScriptGen(true)}
                                        className="group bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 hover:border-transparent px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                                        Asistente Gemini
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrolling Marquee Ticker */}
                        <div className="overflow-hidden border-y border-white/5 bg-black/30 backdrop-blur-sm py-2 mb-6">
                            <div className="marquee-track flex gap-8 whitespace-nowrap">
                                {(
                                    ['8K Cinematic', 'Golden Hour', 'Cyberpunk Neon', 'Macro Product', 'Drone Shot', 'Editorial Fashion', 'Synthwave', 'Analog Film', 'Unreal Engine 5', 'Studio Lighting', 'Bokeh F/1.4', 'Blade Runner', 'National Geographic', 'Futuristic UI', 'CGI Hyperreal',
                                     '8K Cinematic', 'Golden Hour', 'Cyberpunk Neon', 'Macro Product', 'Drone Shot', 'Editorial Fashion', 'Synthwave', 'Analog Film', 'Unreal Engine 5', 'Studio Lighting', 'Bokeh F/1.4', 'Blade Runner', 'National Geographic', 'Futuristic UI', 'CGI Hyperreal']
                                ).map((tag, i) => (
                                    <span key={i} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-[#CC0000]/50" />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                            <div className="px-8 pb-16 max-w-5xl mx-auto relative z-10">
                                <Masonry
                                    breakpointCols={{ default: 3, 900: 2, 600: 1 }}
                                    className="flex gap-5"
                                    columnClassName="flex flex-col gap-5"
                                >
                                    {communityGallery.map((item, idx) => (
                                        <TiltCard key={idx} item={item} idx={idx} />
                                    ))}
                                </Masonry>
                            </div>
                    </motion.div>
                )}

                {renderingAI && (
                    <div className="flex flex-col items-center justify-center p-12 bg-neutral-900/50 rounded-3xl border border-neutral-800 shadow-2xl backdrop-blur-md">
                        <div className="w-16 h-16 border-4 border-neutral-700 border-t-white rounded-full animate-spin mb-6 relative flex items-center justify-center">
                            <span className="absolute text-[10px] font-bold text-white mt-1.5">{renderProgress > 0 ? `${renderProgress}%` : ''}</span>
                        </div>
                        <p className="text-lg font-bold text-white tracking-widest">The Trinity Engines are rendering...</p>
                        {renderProgress > 0 && <p className="text-[#CC0000] font-black tracking-widest text-sm mt-2">{renderProgress}% Completado</p>}
                        <p className="text-xs text-neutral-500 mt-2">Patience, director.</p>
                    </div>
                )}

                {/* Resultados: Opciones Renderizadas */}
                {selectedDraft && selectedDraft.media_options?.length > 0 && !renderingAI && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 p-8 pt-24 overflow-auto custom-scrollbar"
                    >
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-bold text-lg flex items-center gap-3">
                                    ✨ Generations Ready 
                                    <span className="bg-neutral-800 text-xs px-2 py-0.5 rounded text-neutral-400">{selectedDraft.media_options.length} files</span>
                                </h3>
                                <button 
                                    onClick={() => simulateAIGeneration()}
                                    className="bg-[#CC0000]/20 hover:bg-[#CC0000]/40 text-[#CC0000] border border-[#CC0000]/50 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg hover:shadow-[#CC0000]/20"
                                    title="Modifica el prompt a la izquierda y pulsa aquí para recrear"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                                    Re-crear (Mejorar Prompt)
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {selectedDraft.media_options.map((opt, i) => (
                                    <motion.div 
                                        key={i} 
                                        initial={{ opacity: 0, scale: 0.94 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: i * 0.12, ease: 'easeOut' }}
                                        className="group bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-600 rounded-3xl p-3 flex flex-col relative transition-all shadow-xl">
                                        
                                        <div className="absolute top-5 left-5 z-20 flex gap-2">
                                            <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full shadow text-white font-bold text-[10px] tracking-wider uppercase border border-white/10 group-hover:border-white/30 transition-colors">
                                                {opt.isVideo && (opt.url.includes('.mp4') || opt.url.includes('.webm')) ? 'VIDEO' : opt.isVideo ? 'CONCEPT FRAME' : 'IMAGE'}
                                            </span>
                                            <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full shadow text-neutral-400 font-bold text-[10px] uppercase border border-white/10">
                                                {builderData.aspect_ratio}
                                            </span>
                                        </div>
                                        
                                        <div className={`w-full aspect-video bg-[#111] rounded-2xl overflow-hidden relative flex gap-1 ${opt.isVideo || opt.provider.includes('GotSora') ? '' : 'p-1 bg-black/40 border border-neutral-800'}`}>
                                            {opt.isVideo ? (
                                                <div className="w-full h-full relative group/vid overflow-hidden bg-black flex items-center justify-center cursor-pointer" onClick={() => handleMediaClick(opt.url)}>
                                                    {getYouTubeId(opt.url) ? (
                                                        <iframe 
                                                            src={`https://www.youtube.com/embed/${getYouTubeId(opt.url)}?controls=1&autoplay=1&mute=1&loop=1`}
                                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        ></iframe>
                                                    ) : opt.url.includes('.mp4') || opt.url.includes('.webm') ? (
                                                        <video 
                                                            src={opt.url} 
                                                            className="w-full h-full object-cover" 
                                                            autoPlay loop muted playsInline controls
                                                        />
                                                    ) : (
                                                        <>
                                                            <img 
                                                                src={opt.url} 
                                                                alt="concept frame" 
                                                                className="w-full h-full object-cover gallery-img" 
                                                                onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                                            />
                                                            <div style={{display:'none'}} className="absolute inset-0 flex-col items-center justify-center bg-neutral-900 gap-3">
                                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/><line x1="2" y1="2" x2="22" y2="22" stroke="#666"/></svg>
                                                                <p className="text-neutral-500 text-[10px] font-bold uppercase">Sin Resultado</p>
                                                            </div>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                                                            <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                                    <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest">Frame Conceptual — API Key pendiente</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Original Image Pane */}
                                                    <div className="flex-1 rounded-xl overflow-hidden relative cursor-pointer group/orig" onClick={() => handleMediaClick(opt.url)}>
                                                        <img src={opt.url} alt="render" className="w-full h-full object-cover transition-transform duration-700 group-hover/orig:scale-105" />
                                                        {!opt.provider.includes('GotSora') && <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none shadow-md">Original</div>}
                                                    </div>

                                                    {/* Auto-Refined GotSora Pane */}
                                                    {!opt.provider.includes('GotSora') && (
                                                        <div className="flex-1 rounded-xl overflow-hidden relative border border-transparent hover:border-indigo-500/50 transition-colors group/ref bg-[#0f0f0f]">
                                                            {opt.refinedUrl === 'loading' ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full bg-indigo-900/10">
                                                                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-2"></div>
                                                                    <span className="text-[7px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">Aplicando GotSora...</span>
                                                                </div>
                                                            ) : opt.refinedUrl === 'error' || !opt.refinedUrl ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full bg-neutral-900/30">
                                                                    <button onClick={(e) => { e.stopPropagation(); triggerSingleRefine(opt, i, selectedDraft.id, finalPrompt || selectedDraft.visual_prompt); }} className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 xl:scale-100 scale-90">
                                                                        <span>✨</span> Aplicar Filtro
                                                                    </button>
                                                                    <span className="text-[7px] text-neutral-600 mt-2">GotSora Engine Local</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <img src={opt.refinedUrl} alt="refined" onClick={() => handleMediaClick(opt.refinedUrl)} className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover/ref:scale-105" />
                                                                    <div className="absolute top-2 right-2 bg-indigo-600/90 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none shadow-[0_0_10px_rgba(79,70,229,0.5)]">GotSora HQ ✨</div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        
                                        <div className="mt-4 px-2 flex justify-between items-center bg-[#0a0a0a]">
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-500 mb-1">{opt.provider}</p>
                                                <p className="text-xs text-white truncate max-w-[140px] md:max-w-[180px]">{finalPrompt || selectedDraft.visual_prompt || 'Generación AI'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={opt.url} 
                                                    download={`Media_Export_${i+1}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white transition-colors border border-neutral-600"
                                                    title="Descargar Asset a tu PC"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                </a>
                                                

                                                {canSeeAll && (
                                                    <div className="flex gap-1.5">
                                                        {adminProfile?.username?.toLowerCase() === 'alex' && (
                                                            <button onClick={() => handleAction(opt, 'review')} className="bg-[#CC0000] hover:bg-red-800 text-white font-bold text-[9px] uppercase tracking-wider px-4 py-2 rounded-full shadow-[0_0_10px_rgba(204,0,0,0.4)] transition-transform active:scale-95">
                                                                Enviar a Revisión (CM)
                                                            </button>
                                                        )}
                                                        
                                                        {/* Actions below usually for Judith/Admin, visible to SuperAdmin via canSeeAll */}
                                                        {(adminProfile?.is_superadmin || adminProfile?.username?.toLowerCase() === 'oscar') && (
                                                            <>
                                                                <button onClick={() => handleAction(opt, 'reject')} className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-2 rounded-full transition-colors flex items-center" title="Devolver a Cockers">
                                                                    ↩️ Rechazar
                                                                </button>
                                                                <button onClick={() => handleAction(opt, 'approve')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-wider px-4 py-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-transform active:scale-95">
                                                                    Aprobar ✔️
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {/* Panel: Mejorar y Regenerar (Goyi Learning Flow) */}
                            <div className="mt-8 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#CC0000]/20 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                <label className="text-xs font-bold text-neutral-400 flex items-center gap-2 mb-3 tracking-wide">
                                    <span className="text-yellow-500 text-lg">💡</span> ¿Las IAs no captaron la visión? Mejora el prompt, dale otra oportunidad y alimenta nuestra DB:
                                </label>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Haz que la iluminación sea estilo cyberpunk y elimina el ruido de fondo..." 
                                        className="flex-1 bg-[#161616] border border-neutral-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-[#CC0000] text-sm transition-colors shadow-inner"
                                    />
                                    <button 
                                        onClick={() => simulateAIGeneration()}
                                        className="bg-[#CC0000] hover:bg-red-800 text-white font-black px-8 py-4 md:py-0 rounded-xl text-xs uppercase tracking-widest transition-transform active:scale-95 flex justify-center items-center gap-3 shadow-[0_0_15px_rgba(204,0,0,0.4)]"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
                                        REGENERAR
                                    </button>
                                </div>
                            </div>
                            
                            {/* Copywriting / Info del Draft Ligado */}
                            {selectedDraft.caption && (
                                <div className="mt-10 bg-[#111] border border-neutral-800 rounded-3xl p-6">
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Post Copy asignado</h4>
                                    <p className="text-sm font-light text-neutral-300 whitespace-pre-wrap leading-relaxed">{selectedDraft.caption}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
