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
    const [liveSlots, setLiveSlots] = useState([]); // Progressive: each slot has { provider, status, progress, url, isVideo }

    // Aplica Filtro Ultra (Gemini imagen) a un slot específico de liveSlots
    const triggerUltraVariant = useCallback(async (slot, slotIdx, prompt) => {
        if (!slot.url) return;
        const token = localStorage.getItem('adminToken');
        setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'loading' } : s));
        try {
            const refineRes = await fetch('/api/studio/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ imageUrl: slot.url, prompt: `${prompt || 'hyper-realistic'}, high quality, masterpiece, 8k, ultra detail` })
            });
            const refineData = await refineRes.json();
            if (!refineRes.ok || !refineData.job_id) throw new Error(refineData.error || 'Error iniciando Ultra Variant');

            let refAttempts = 0;
            const MAX_REFINE_ATTEMPTS = 30; // ~150s timeout
            const refPoll = setInterval(async () => {
                refAttempts++;
                if (refAttempts > MAX_REFINE_ATTEMPTS) {
                    clearInterval(refPoll);
                    setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'error', refinedError: 'Tiempo de espera agotado' } : s));
                    return;
                }
                try {
                    const sRes = await fetch(`/api/studio/status/${encodeURIComponent(refineData.job_id)}?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!sRes.ok) { // 400 = job expirado en RAM del servidor
                        clearInterval(refPoll);
                        setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'error', refinedError: 'Job expirado en servidor' } : s));
                        return;
                    }
                    const sData = await sRes.json();
                    if (sData.status === 'succeed' && sData.result_url) {
                        clearInterval(refPoll);
                        setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: sData.result_url } : s));
                    } else if (sData.status === 'failed') {
                        clearInterval(refPoll);
                        setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'error', refinedError: sData.error || 'Falla Ultra Engine' } : s));
                    }
                } catch { clearInterval(refPoll); setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'error', refinedError: 'Server Timeout' } : s)); }
            }, 5000);
        } catch (e) {
            setLiveSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, refinedUrl: 'error', refinedError: e.message } : s));
        }
    }, []);

    
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
        return shuffled.slice(0, 12);
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
                setCommunityGallery(data.gallery.length > 0 ? data.gallery : COMMUNITY_GALLERY_POOL.slice(0, 12));
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
    const [showCustomFilterModal, setShowCustomFilterModal] = useState(false);
    const [customFilterForm, setCustomFilterForm] = useState({ label: '', lens: '', lighting: '', grain: '', mood: '', extra: '' });

    // ── Banco base FIJO de filtros profesionales ──────────────────────────
    const BASE_PHOTO_FILTERS = [
        // Realismo fotográfico
        { id: 'ultra_real',     label: '📷 Ultra Realismo',    prompt: 'Photorealistic, ultra-detailed, sharp focus, natural light, Sony A7R V, 8K resolution, RAW file quality, no filters, documentary realism' },
        { id: 'hyper_real',     label: '🔬 Hiper Real',        prompt: 'Hyperrealism, every pore and texture visible, clinical sharpness, studio controlled lighting, Canon EF 100mm macro, ultra high definition' },
        // Lentes analógicas
        { id: 'lens_28mm',      label: '🎞️ 28mm Gran Angular',  prompt: '28mm wide-angle lens, slight barrel distortion, deep depth of field, architectural perspective, street photography aesthetic, analogue film grain' },
        { id: 'lens_35mm_40s',  label: '📽️ 35mm Cine 40s',     prompt: '35mm film, 1940s cinematic look, soft grain, warm sepia-to-silver tones, dramatic chiaroscuro, classic Hollywood golden era cinematography' },
        { id: 'lens_35mm',      label: '📸 35mm Analógico',    prompt: '35mm analog film photography, authentic grain texture, Kodak Portra 400, warm color rendition, slightly desaturated highlights, photojournalism style' },
        { id: 'lens_40mm',      label: '🎯 40mm Pancake',      prompt: '40mm pancake lens, natural perspective, compact street photography, moderate bokeh, Leica-style rendering, reportage documentary feel' },
        { id: 'lens_50mm',      label: '👁️ 50mm Ojo Humano',   prompt: '50mm standard lens, natural human perspective, shallow depth of field f/1.8, beautiful circular bokeh, portrait photography, Nikon D850' },
        { id: 'lens_85mm',      label: '👠 85mm Retrato',      prompt: '85mm portrait lens f/1.4, silky smooth bokeh background, razor-sharp subject focus, flattering facial compression, professional portrait studio' },
        // Formatos cine
        { id: 'cine_scope',     label: '🎬 Cinemascope 2.39:1', prompt: 'Anamorphic widescreen 2.39:1 aspect ratio, oval bokeh lens flares, horizontal letterbox, Hollywood blockbuster cinematography, ARRI ALEXA camera' },
        { id: 'cine_16mm',      label: '🎥 16mm Indie',        prompt: '16mm film stock, heavy organic grain, desaturated muted palette, raw handheld aesthetic, indie documentary cinema, gritty emotional realism' },
        { id: 'cine_lut',       label: '🌈 LUT Cine Pro',      prompt: 'Professional color grading LUT applied, teal-orange complementary color scheme, lifted blacks, crushed highlights, Hollywood blockbuster grade' },
        { id: 'cine_vhs',       label: '📼 VHS Retro',         prompt: 'VHS tape analog artifacts, color bleeding chromatic aberration, scan lines, low resolution noise, 80s 90s lo-fi camcorder aesthetic' },
        // Ilustración y caricatura
        { id: 'cartoon_toon',   label: '🎨 Cartoon Studio',    prompt: 'Cartoon illustration style, bold clean outlines, flat vibrant colors, expressive exaggerated features, modern 2D animation aesthetic, Disney Pixar inspired' },
        { id: 'cartoon_comic',  label: '💥 Cómic Book',        prompt: 'Comic book style, bold black ink outlines, Ben-Day dot pattern, over-saturated primary colors, dramatic speech bubble composition, Marvel DC aesthetic' },
        { id: 'anime_ghibli',   label: '🌸 Anime Ghibli',      prompt: 'Studio Ghibli anime style, soft watercolor backgrounds, lush nature details, warm earthy palette, hand-drawn 2D animation, Hayao Miyazaki aesthetic' },
        { id: 'anime_modern',   label: '⚡ Anime Dark',        prompt: 'High-budget dark anime art, sharp shading, dramatic lighting contrasts, detailed character design, Attack on Titan aesthetic, vibrant action composition' },
        { id: 'claymation',     label: '🧸 Stop Motion',       prompt: 'Stop motion claymation style, plasticine textures, visible fingerprint marks, tilt-shift miniature effect, Aardman Wallace Gromit aesthetic' },
        { id: 'watercolor',     label: '🖌️ Acuarela',          prompt: 'Traditional watercolor painting, visible paper texture, soft wet-on-wet bleeding edges, transparent layered washes, impressionist looseness' },
        { id: 'oil_painting',   label: '🖼️ Óleo Clásico',      prompt: 'Oil painting classical style, visible textured brushstrokes, impasto technique, Rembrandt dramatic lighting, museum quality old master aesthetic' },
        { id: 'pixel_16bit',    label: '🕹️ Pixel Art 16-bit',  prompt: '16-bit pixel art style, isometric perspective, limited color palette, retro SNES SEGA era sprites, sharp pixel edges, nostalgic gaming aesthetic' },
        // Corrección / Mejora fotográfica
        { id: 'fix_sharp',      label: '🔭 Súper Definición',  prompt: 'AI-enhanced sharpness, denoised, restored detail in shadows and highlights, professional retouching, no chromatic aberration, tack-sharp studio quality' },
        { id: 'fix_hdr',        label: '☀️ HDR Natural',       prompt: 'Natural HDR processing, balanced exposure across highlights and shadows, rich color depth, detailed sky gradients, no tone-mapping halo artifacts' },
        { id: 'fix_bw',         label: '⬛ B&N Dramático',     prompt: 'Black and white photography, high contrast dramatic tones, deep rich blacks, bright whites, silver gelatin print aesthetic, Ansel Adams style' },
        { id: 'fix_golden',     label: '🌅 Golden Hour',       prompt: 'Golden hour natural sunlight, warm orange amber tones, long soft shadows, rim lighting effect, atmospheric haze, landscape photography magic hour' },
        { id: 'fix_lowlight',   label: '🌙 Noche ISO Alta',    prompt: 'Night photography, high ISO grain texture, long exposure light trails, available light only, moody dark atmosphere, luminous point lights bokeh' },
        { id: 'fix_commercial', label: '💎 Foto Comercial',    prompt: 'Commercial product photography, clean white cyclorama background, controlled studio strobe lighting, professional retouching, advertising catalog quality' },
    ];

    const [savedCustomFilters, setSavedCustomFilters] = useState(() => {
        try { return JSON.parse(localStorage.getItem('godzilla_custom_filters_v2') || '[]'); } catch { return []; }
    });

    // Todos los filtros activos = base fija + custom guardados + dinámicos de IA
    const [dynamicFilters, setDynamicFilters] = useState([]);
    const [isFetchingFilters, setIsFetchingFilters] = useState(false);

    const ALL_FILTERS = [...BASE_PHOTO_FILTERS, ...savedCustomFilters, ...dynamicFilters];

    const fetchDynamicFilters = async () => {
        setIsFetchingFilters(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${'' || ''}/api/studio/dynamic-filters`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.filters) {
                setDynamicFilters(data.filters);
            }
        } catch (e) {
            console.error("Filter Error", e);
        }
        setIsFetchingFilters(false);
    };

    const saveCustomFilter = () => {
        if (!customFilterForm.label.trim()) { alert('Ponle un nombre al filtro.'); return; }
        const parts = [
            customFilterForm.lens    && `lens: ${customFilterForm.lens}`,
            customFilterForm.lighting && `lighting: ${customFilterForm.lighting}`,
            customFilterForm.grain   && `grain/texture: ${customFilterForm.grain}`,
            customFilterForm.mood    && `mood: ${customFilterForm.mood}`,
            customFilterForm.extra   && customFilterForm.extra,
        ].filter(Boolean);
        if (parts.length === 0) { alert('Agrega al menos un parámetro técnico.'); return; }
        const newFilter = {
            id: 'custom_' + Date.now(),
            label: '⚙️ ' + customFilterForm.label.trim(),
            prompt: parts.join(', ')
        };
        const updated = [...savedCustomFilters, newFilter];
        setSavedCustomFilters(updated);
        localStorage.setItem('godzilla_custom_filters_v2', JSON.stringify(updated));
        setCustomFilterForm({ label: '', lens: '', lighting: '', grain: '', mood: '', extra: '' });
        setShowCustomFilterModal(false);
    };

    const deleteCustomFilter = (id) => {
        const updated = savedCustomFilters.filter(f => f.id !== id);
        setSavedCustomFilters(updated);
        localStorage.setItem('godzilla_custom_filters_v2', JSON.stringify(updated));
        setSelectedFilters(prev => prev.filter(p => !updated.find(u => u.prompt === p)));
    };

    useEffect(() => {
        fetchDynamicFilters();
    }, []);

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
                
                // Poll checkRenderStatus con timeout máximo y manejo de 400
                let purifyAttempts = 0;
                const MAX_PURIFY_ATTEMPTS = 60; // ~3min timeout
                const pollTimer = setInterval(async () => {
                    purifyAttempts++;
                    if (purifyAttempts > MAX_PURIFY_ATTEMPTS) {
                        clearInterval(pollTimer);
                        setPurifyingStatus(null);
                        alert('Tiempo de purificación agotado. El servidor puede haber reiniciado.');
                        return;
                    }
                    try {
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!stRes.ok) { // 400 = job no existe en RAM
                            clearInterval(pollTimer);
                            setPurifyingStatus(null);
                            alert('El job de purificación expiró — el servidor pudo haberse reiniciado.');
                            return;
                        }
                        const stData = await stRes.json();
                        setPurifyPercent(stData.progress || 0);
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

    // Ultra Variant para selectedDraft (panel de resultados guardados)
    const refineWithUltra = async (url, promptContext, optionIndex) => {
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
                let ultraAttempts = 0;
                const MAX_ULTRA_ATTEMPTS = 30; // ~90s timeout
                const pollTimer = setInterval(async () => {
                    ultraAttempts++;
                    if (ultraAttempts > MAX_ULTRA_ATTEMPTS) {
                        clearInterval(pollTimer);
                        setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
                        return;
                    }
                    try {
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!stRes.ok) { clearInterval(pollTimer); setRefiningTasks(prev => ({ ...prev, [optionIndex]: false })); return; }
                        const stData = await stRes.json();
                        
                        if (stData.status === 'succeed') {
                            clearInterval(pollTimer);
                            setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
                            
                            // Añadir variante ultra al lado del original
                            setSelectedDraft(prev => {
                                if (!prev) return prev;
                                const newOpts = [...prev.media_options];
                                const origOpt = newOpts[optionIndex];
                                newOpts.splice(optionIndex + 1, 0, {
                                    url: stData.result_url,
                                    provider: origOpt.provider + ' + ✨ Ultra HQ',
                                    isVideo: origOpt.isVideo
                                });
                                const newState = { ...prev, media_options: newOpts };
                                setQueue(q => q.map(post => post.id === prev.id ? newState : post));
                                return newState;
                            });
                        } else if (stData.status === 'failed' || stData.status === 'error') {
                            clearInterval(pollTimer);
                            setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
                            alert("Error en filtro Ultra: " + (stData.error || "Falla desconocida"));
                        }
                    } catch (e) {
                        clearInterval(pollTimer);
                        setRefiningTasks(prev => ({ ...prev, [optionIndex]: false }));
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

    const triggerUltraOnOption = async (opt, optIndex, draftId, promptText) => {
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
                let singleAttempts = 0;
                const MAX_SINGLE_ATTEMPTS = 30;
                const pollTimer = setInterval(async () => {
                    singleAttempts++;
                    if (singleAttempts > MAX_SINGLE_ATTEMPTS) { clearInterval(pollTimer); updateOption(draftId, optIndex, { refinedUrl: 'error' }); return; }
                    try {
                        const stRes = await fetch(`${'' || ''}/api/studio/status/${encodeURIComponent(data.job_id)}?t=${Date.now()}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!stRes.ok) { clearInterval(pollTimer); updateOption(draftId, optIndex, { refinedUrl: 'error' }); return; }
                        const stData = await stRes.json();
                        
                        if (stData.status === 'succeed') {
                            clearInterval(pollTimer);
                            updateOption(draftId, optIndex, { refinedUrl: stData.result_url });
                        } else if (stData.status === 'failed' || stData.status === 'error') {
                            clearInterval(pollTimer);
                            updateOption(draftId, optIndex, { refinedUrl: 'error' });
                        }
                    } catch(e) { clearInterval(pollTimer); updateOption(draftId, optIndex, { refinedUrl: 'error' }); }
                }, 4000);
            } else {
                updateOption(draftId, optIndex, { refinedUrl: 'error' });
            }
        } catch(e) {
            updateOption(draftId, optIndex, { refinedUrl: 'error' });
        }
    };

    const triggerAutoUltra = async (optionsList, promptText, draftId) => {
        optionsList.forEach((opt, i) => {
             if (!opt.isVideo) {
                 triggerUltraOnOption(opt, i, draftId, promptText);
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

    // Enviar slot en vivo a revisión — funciona SIN necesitar selectedDraft existente
    const sendSlotToReview = async (slot) => {
        if (!slot.url) return;
        if (!window.confirm(`¿Enviar resultado de "${slot.provider}" a revisión para CEO Estudio?`)) return;
        
        const token = localStorage.getItem('adminToken');
        try {
            // Si hay draft ya cargado, solo actualizamos su estado
            if (selectedDraft && selectedDraft.id && selectedDraft.id !== 999) {
                const res = await fetch(`/api/studio/tasks/${selectedDraft.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        status: 'pending_cm_approval',
                        media_payload: [{ url: slot.url, provider: slot.provider, isVideo: slot.isVideo || false }]
                    })
                });
                const d = await res.json();
                if (!d.success) throw new Error(d.message || 'Error actualizando tarea');
                setQueue(q => q.map(t => t.id === selectedDraft.id ? { ...t, status: 'pending_cm_approval' } : t));
                alert(`✅ Enviado a revisión. Revísalo en CEO Estudio.`);
                return;
            }
            
            // Si NO hay draft, creamos tarea nueva en pending_cm_approval
            const res = await fetch('/api/studio/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    title: finalPrompt.substring(0, 100) || `Arte de ${slot.provider}`,
                    prompt: finalPrompt,
                    ig_publish_date: new Date(Date.now() + 86400000 * 2).toISOString(),
                    media_payload: JSON.stringify([{ url: slot.url, provider: slot.provider, isVideo: slot.isVideo || false }])
                })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.message || 'Error creando tarea');

            // Mensaje de confirmación
            alert(`✅ Activo enviado a revisión. Revísalo en CEO Estudio.`);
            setQueue(q => [{ id: d.task?.id || Date.now(), status: 'pending_cm_approval', caption: finalPrompt.substring(0, 100), visual_prompt: finalPrompt, media_options: [{ url: slot.url, provider: slot.provider, isVideo: slot.isVideo || false }] }, ...q]);
        } catch (e) {
            console.error(e);
            alert(`⚠️ Error: ${e.message}`);
        }
    };

    const simulateAIGeneration = async () => {
        if (!finalPrompt.trim()) return alert('Escribe un prompt antes de generar.');
        setRenderingAI(true);
        setRenderProgress(0);
        setSelectedDraft(null);

        const rawPrompt = finalPrompt.trim();
        const token = localStorage.getItem('adminToken');

        // Feedback learning
        if (finalPrompt && selectedDraft?.visual_prompt && finalPrompt !== selectedDraft.visual_prompt) {
            fetch('/api/studio/learning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ original_prompt: selectedDraft.visual_prompt, improved_prompt: finalPrompt, context_type: 'cockers_regenerate' })
            }).catch(() => {});
        }

        const enginesToRun = genMode === 'video'
            ? ['Veo 3 (Toma 1)', 'Veo 3 (Toma 2)', 'Veo 3 (Toma 3)', 'Veo 3 Fast']
            : ['Imagen 4 Ultra', 'Imagen 4 Pro', 'Gemini 3.1 Flash Image'];

        const promptAmentado = selectedFilters.length > 0
            ? `${finalPrompt}. ${selectedFilters.join(', ')}` : finalPrompt;

        const isVideoMode = genMode === 'video';
        const ar = builderData.aspect_ratio || '16:9';

        // Aspect ratio → CSS class
        const arClass = { '16:9': 'aspect-video', '9:16': 'aspect-[9/16]', '1:1': 'aspect-square', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]' }[ar] || 'aspect-video';

        // ── 1. Mostrar slots vacíos inmediatamente ──
        const initialSlots = enginesToRun.map(engineName => ({
            provider: engineName,
            status: 'loading',
            progress: 0,
            url: null,
            refinedUrl: null,
            isVideo: isVideoMode,
            aspect_ratio: ar,
            arClass
        }));
        setLiveSlots(initialSlots);

        const updateSlot = (idx, patch) => {
            setLiveSlots(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], ...patch };
                return next;
            });
        };

        try {
            // ── 2. Lanzar requests con stagger ──
            const toPoll = [];

            for (let idx = 0; idx < enginesToRun.length; idx++) {
                const engineName = enginesToRun[idx];
                if (idx > 0) await new Promise(r => setTimeout(r, 1800));
                try {
                    const resFetch = await fetch('/api/studio/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ prompt: promptAmentado, mode: isVideoMode ? 'video' : 'imagen', engine: engineName, config: { ...builderData, refImage } })
                    });
                    const data = await resFetch.json();
                    if (!resFetch.ok) throw new Error(data.error || `HTTP ${resFetch.status}`);

                    if (data.status === 'succeed' && data.result_url) {
                        const url = Array.isArray(data.result_url) ? data.result_url[0] : data.result_url;
                        updateSlot(idx, { status: 'done', url, progress: 100 });
                    } else if (data.status === 'processing' && data.job_id) {
                        toPoll.push({ idx, engineName, job_id: data.job_id, done: false });
                        updateSlot(idx, { status: 'loading', progress: 5 });
                    } else {
                        updateSlot(idx, { status: 'failed', progress: 100 });
                    }
                } catch(e) {
                    updateSlot(idx, { status: 'failed', progress: 100 });
                }
            }

            if (toPoll.length === 0) { setRenderingAI(false); return; }

            // ── 3. Polling independiente por slot ──
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                for (const task of toPoll) {
                    if (task.done) continue;
                    try {
                        let sData = null;
                        try {
                            const sRes = await fetch(`/api/studio/status/${encodeURIComponent(task.job_id)}?t=${Date.now()}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (sRes.ok) sData = await sRes.json();
                        } catch (e) {
                            // Silencioso ante errores 502/net errs temporales.
                        }

                        if (!sData) {
                            task.failCt = (task.failCt || 0) + 1;
                            // 25 retries antes de darlo por muerto en frontend (evita cortes por red inestable)
                            if (task.failCt > 25) {
                                task.done = true;
                                updateSlot(task.idx, { status: 'failed', progress: 100 });
                            }
                            continue;
                        }

                        updateSlot(task.idx, { progress: sData.progress || Math.min(attempts * 2, 92) });

                        if (sData.status === 'succeed') {
                            task.done = true;
                            const url = Array.isArray(sData.result_url) ? sData.result_url[0] : sData.result_url;
                            updateSlot(task.idx, { status: 'done', url, progress: 100, isVideo: sData.isVideo || isVideoMode });
                        } else if (sData.status === 'failed') {
                            task.done = true;
                            updateSlot(task.idx, { status: 'failed', progress: 100, errorMsg: sData.error || "Falla desconocida" });
                        }
                    } catch(e) { /* silencioso */ }
                }

                const doneCt = toPoll.filter(t => t.done).length;
                setRenderProgress(Math.round((doneCt / toPoll.length) * 100));

                if (toPoll.every(t => t.done) || attempts > 350) {
                    clearInterval(pollInterval);
                    setRenderingAI(false);
                }
            }, 6000);

        } catch (error) {
            console.error('Error Live Gen', error);
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
                className={`gallery-card relative group rounded-2xl overflow-hidden border border-white/5 hover:border-[#CC0000]/60 transition-colors shadow-xl shadow-black/60 aspect-video bg-[#0f0f0f] min-h-[220px] flex flex-col justify-center${isFeatured ? ' featured' : ''}`}
            >
                {/* Scan sweep shimmer */}
                <div className="scan-overlay pointer-events-none" />
                {/* Shimmer skeleton */}
                <div className="absolute inset-0 bg-neutral-900 animate-pulse pointer-events-none" />
                <img
                    src={item.img}
                    alt={item.tag}
                    loading="lazy"
                    className="gallery-img absolute inset-0 z-10 w-full h-full object-cover block pointer-events-none"
                    onError={(e) => { e.target.style.opacity = 0; }}
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
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                    <p className="text-white font-bold text-sm mb-0.5">{item.tag}</p>
                    <p className="text-neutral-400 text-[10px] line-clamp-2 leading-relaxed mb-3">{item.prompt}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setFinalPrompt(item.prompt); }} className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-emerald-600/50 backdrop-blur-xl border border-white/10 hover:border-emerald-500/50 rounded-full py-1.5 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Usar Prompt
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleFilter(item.tag); }} className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-[#CC0000]/50 backdrop-blur-xl border border-white/10 hover:border-[#CC0000]/50 rounded-full py-1.5 text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            + Filtro
                        </button>
                    </div>
                </div>
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
        <div className="flex w-full h-full bg-[#0a0a09] text-white overflow-hidden relative">
            
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
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Veo 3.1 — Plan Ultra</span>
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
                        {dynamicFilters.slice(0, 10).map((preset, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setFinalPrompt(preset.prompt)}
                                className="shrink-0 bg-[#1a1a19] hover:bg-[#CC0000]/20 border border-neutral-800 hover:border-[#CC0000]/50 text-neutral-400 hover:text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                            >
                                {preset.label}
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
                                {/* Estilos Fotográficos / Filtros — Banco Profesional */}
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2 flex items-center justify-between">
                                        Filtros de Estilo
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">{selectedFilters.length} activos</span>
                                            <button onClick={() => setSelectedFilters([])} className="text-[7px] text-neutral-600 hover:text-red-400 transition-colors">Limpiar</button>
                                        </span>
                                    </p>

                                    {/* ─ Base Fija ─ */}
                                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-700 mb-1.5 mt-1">📐 Lentes / Realismo / Arte</p>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {BASE_PHOTO_FILTERS.map(filter => {
                                            const isActive = selectedFilters.includes(filter.prompt);
                                            return (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => toggleFilter(filter.prompt)}
                                                    title={filter.prompt}
                                                    className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border flex items-center gap-1.5 ${isActive ? 'bg-[#CC0000] text-white border-[#CC0000] shadow-[0_0_10px_rgba(204,0,0,0.5)]' : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-white'}`}
                                                >
                                                    {filter.label}
                                                    {isActive && <span className="text-[7px] bg-red-900/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* ─ Custom Guardados ─ */}
                                    {savedCustomFilters.length > 0 && (
                                        <>
                                            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-700 mb-1.5">⚙️ Mis Filtros Personalizados</p>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {savedCustomFilters.map(filter => {
                                                    const isActive = selectedFilters.includes(filter.prompt);
                                                    return (
                                                        <div key={filter.id} className="flex items-center gap-0.5">
                                                            <button
                                                                onClick={() => toggleFilter(filter.prompt)}
                                                                title={filter.prompt}
                                                                className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-l-full transition-all border-y border-l flex items-center gap-1.5 ${isActive ? 'bg-violet-600 text-white border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]' : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-violet-600/50 hover:text-white'}`}
                                                            >
                                                                {filter.label}
                                                                {isActive && <span className="text-[7px] bg-violet-900/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>}
                                                            </button>
                                                            <button
                                                                onClick={() => deleteCustomFilter(filter.id)}
                                                                title="Eliminar filtro"
                                                                className="px-1 py-1.5 text-[8px] text-neutral-700 hover:text-red-400 border-y border-r border-neutral-800 hover:border-red-500/30 rounded-r-full transition-colors"
                                                            >🗑</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {/* ─ IA Dinámicos ─ */}
                                    {dynamicFilters.length > 0 && (
                                        <>
                                            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-neutral-700 mb-1.5 flex items-center justify-between">
                                                🤖 IA Generativa
                                                <button onClick={fetchDynamicFilters} disabled={isFetchingFilters}
                                                    className="text-[7px] text-indigo-500/60 hover:text-indigo-400 transition-colors disabled:opacity-40 ml-2">
                                                    {isFetchingFilters ? '⏳' : '↺ Nuevos'}
                                                </button>
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {dynamicFilters.map(filter => {
                                                    const isActive = selectedFilters.includes(filter.prompt);
                                                    return (
                                                        <button
                                                            key={filter.id}
                                                            onClick={() => toggleFilter(filter.prompt)}
                                                            title={filter.prompt}
                                                            className={`px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border flex items-center gap-1.5 ${isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-transparent text-neutral-600 border-neutral-800/60 hover:border-indigo-500/40 hover:text-neutral-300'}`}
                                                        >
                                                            {filter.label}
                                                            {isActive && <span className="text-[7px] bg-indigo-900/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {/* ─ Botón crear filtro ─ */}
                                    <button
                                        onClick={() => setShowCustomFilterModal(true)}
                                        className="w-full mt-1 border border-dashed border-violet-600/40 hover:border-violet-500 text-violet-500/60 hover:text-violet-400 text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>+</span> Crear Filtro Personalizado
                                    </button>

                                    {/* ─ Píldoras de galería comunitaria activas ─ */}
                                    {selectedFilters.some(sf => !ALL_FILTERS.find(f => f.prompt === sf)) && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {selectedFilters.map(sf => {
                                                if (ALL_FILTERS.find(f => f.prompt === sf)) return null;
                                                const comm = COMMUNITY_GALLERY_POOL.find(c => c.prompt === sf);
                                                const label = comm ? comm.tag : 'Galería';
                                                return (
                                                    <button key={sf} onClick={() => toggleFilter(sf)}
                                                        className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full border bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] flex items-center gap-1.5"
                                                        title="Filtro seleccionado de la Galería">
                                                        ✨ {label}
                                                        <span className="text-[7px] bg-indigo-900/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✕</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
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

                {/* ── PROGRESSIVE LIVE SLOTS ── Aparece en cuanto se da clic en Generar */}
                {liveSlots.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-0 overflow-auto custom-scrollbar pt-24 pb-10 px-6"
                    >
                        <style>{GALLERY_CSS}</style>
                        <div className="max-w-5xl mx-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[9px] font-black text-[#CC0000] uppercase tracking-[0.3em]">Generaciones en Vivo</p>
                                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                                        Generations Ready
                                        <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-bold">{liveSlots.filter(s => s.status === 'done').length} / {liveSlots.length} listos</span>
                                    </h2>
                                </div>
                                {renderingAI && (
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        Generando... {renderProgress}%
                                    </div>
                                )}
                            </div>

                            {/* Slot Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {liveSlots.map((slot, i) => {
                                    const arStyle = {
                                        '16:9': 'aspect-video',
                                        '9:16': 'aspect-[9/16]',
                                        '1:1':  'aspect-square',
                                        '4:3':  'aspect-[4/3]',
                                        '3:4':  'aspect-[3/4]',
                                    }[slot.aspect_ratio] || 'aspect-video';

                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.4, delay: i * 0.06 }}
                                            className="rounded-2xl overflow-hidden border border-white/5 hover:border-[#CC0000]/40 transition-colors shadow-xl shadow-black/60 bg-[#0a0a0a]"
                                        >
                                            {/* Media Area */}
                                            <div className={`${arStyle} relative w-full overflow-hidden bg-neutral-900 flex`}>
                                                {slot.status === 'loading' ? (
                                                    /* Skeleton con progreso */
                                                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-black gap-3 relative overflow-hidden">
                                                        {/* Shimmer sweep */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[scanSweep_1.8s_linear_infinite] bg-[length:200%_100%]" />
                                                        <div className="w-7 h-7 border-2 border-neutral-700 border-t-[#CC0000] rounded-full animate-spin" />
                                                        <span className="text-[8px] text-neutral-500 font-black uppercase tracking-widest">{slot.provider}</span>
                                                        {/* Progress Bar */}
                                                        <div className="w-2/3 h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#CC0000] to-red-400 rounded-full transition-all duration-500"
                                                                style={{ width: `${slot.progress || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[7px] text-neutral-600 font-bold">{slot.progress || 0}%</span>
                                                    </div>
                                                ) : slot.status === 'failed' ? (
                                                    /* Error State - Soft Retry UI */
                                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-neutral-900 border-2 border-dashed border-red-900/40 rounded-xl m-2 opacity-80 cursor-pointer p-4 text-center" onClick={() => simulateAIGeneration()}>
                                                        <span className="text-xl">⚠️</span>
                                                        <span className="text-[9px] text-[#CC0000] font-black uppercase tracking-widest leading-loose">
                                                            {slot.errorMsg || `Falla de motor ${slot.provider}`}
                                                        </span>
                                                        <span className="text-[8px] text-red-500/80 bg-red-900/10 px-2 py-1 rounded">Clic para Reintentar</span>
                                                    </div>
                                                ) : slot.isVideo ? (
                                                    /* Video Done */
                                                    <div className="flex-1 relative cursor-pointer" onClick={() => handleMediaClick(slot.url)}>
                                                        {getYouTubeId(slot.url) ? (
                                                            <iframe src={`https://www.youtube.com/embed/${getYouTubeId(slot.url)}?autoplay=1&mute=1&loop=1`} className="absolute inset-0 w-full h-full" allowFullScreen />
                                                        ) : (
                                                            <video src={slot.url} className="w-full h-full object-cover" autoPlay loop muted playsInline controls />
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Image Done — split Original / GotSora */
                                                    <>
                                                        <div className="flex-1 relative cursor-pointer group/orig" onClick={() => handleMediaClick(slot.url)}>
                                                            <img src={slot.url} alt={slot.provider} className="w-full h-full object-cover transition-transform duration-700 group-hover/orig:scale-105" />
                                                            <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[7px] uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none">Original</div>
                                                        </div>
                                                        {/* Gemini Ultra Pane */}
                                                        <div className="flex-1 relative border-l border-white/5 bg-[#0f0f0f] group/ref hover:border-indigo-500/40 transition-colors">
                                                            {slot.refinedUrl === 'loading' ? (
                                                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                                                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                    <span className="text-[7px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">Gemini Ultra...</span>
                                                                </div>
                                                            ) : slot.refinedUrl && slot.refinedUrl !== 'error' ? (
                                                                <>
                                                                    <img src={slot.refinedUrl} alt="refined" onClick={() => handleMediaClick(slot.refinedUrl)} className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover/ref:scale-105" />
                                                                    <div className="absolute top-2 right-2 bg-indigo-600/90 px-2 py-0.5 rounded text-[7px] uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none shadow-[0_0_8px_rgba(79,70,229,0.6)]">Ultra HQ ✨</div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
                                                                    {slot.refinedUrl === 'error' && (
                                                                        <span className="text-[8px] text-center text-red-500 font-bold mb-1 leading-tight">{slot.refinedError || 'Error al conectar'}</span>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); triggerUltraVariant(slot, i, finalPrompt); }}
                                                                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[8px] font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                                                                    >
                                                                        <span>✨</span> {slot.refinedUrl === 'error' ? 'Reintentar Ultra' : '+ Variante Ultra'}
                                                                    </button>
                                                                    <span className="text-[7px] text-neutral-600">Gemini Ultra Engine</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Footer del slot */}
                                            <div className="px-3 py-2 flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{slot.provider}</p>
                                                    <p className="text-[10px] text-neutral-300 truncate max-w-[100px]">{finalPrompt.substring(0, 30)}...</p>
                                                </div>
                                                {slot.status === 'done' && !slot.isVideo && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* Botón "Enviar a Revisión" — solo para Alex/Cockers */}
                                                        {isCockers && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); sendSlotToReview(slot); }}
                                                                title="Enviar a revisión para Judith"
                                                                className="flex items-center gap-1 bg-[#CC0000]/15 hover:bg-[#CC0000] border border-[#CC0000]/40 hover:border-[#CC0000] text-[#CC0000] hover:text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all"
                                                            >
                                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                                                Revisión
                                                            </button>
                                                        )}
                                                        {/* Botón de Descargar */}
                                                        <a href={slot.url} download={`${slot.provider}_output`} target="_blank" rel="noreferrer"
                                                            className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white transition-colors border border-neutral-700 shrink-0"
                                                            title="Descargar"
                                                        >
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                        </a>
                                                    </div>
                                                )}
                                                {slot.status === 'done' && slot.isVideo && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isCockers && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); sendSlotToReview(slot); }}
                                                                title="Enviar video a revisión para Judith"
                                                                className="flex items-center gap-1 bg-[#CC0000]/15 hover:bg-[#CC0000] border border-[#CC0000]/40 hover:border-[#CC0000] text-[#CC0000] hover:text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-all"
                                                            >
                                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                                                Revisión
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Si no hay liveSlots ni generación, mostramos el Explore Gallery */}
                {!renderingAI && liveSlots.length === 0 && (

                    <div 
                        key={genMode}
                        className="absolute inset-0 overflow-auto custom-scrollbar animate-fade-in"
                    >
                        {/* Inject dynamic CSS */}
                        <style>{GALLERY_CSS}</style>

                        {/* Ambient background orbs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
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
                    </div>
                )}

                {/* Loader removido a peticion del director, el espacio ahora es para el 4to motor */}

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

                                                    {/* Auto-Refined Gemini Pane */}
                                                    {!opt.provider.includes('GotSora') && (
                                                        <div className="flex-1 rounded-xl overflow-hidden relative border border-transparent hover:border-indigo-500/50 transition-colors group/ref bg-[#0f0f0f]">
                                                            {opt.refinedUrl === 'loading' ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full bg-indigo-900/10">
                                                                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-2"></div>
                                                                    <span className="text-[7px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">Aplicando Ultra...</span>
                                                                </div>
                                                            ) : opt.refinedUrl === 'error' || !opt.refinedUrl ? (
                                                                <div className="flex flex-col items-center justify-center h-full w-full bg-neutral-900/30">
                                                                    <button onClick={(e) => { e.stopPropagation(); triggerSingleRefine(opt, i, selectedDraft.id, finalPrompt || selectedDraft.visual_prompt); }} className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 xl:scale-100 scale-90">
                                                                        <span>✨</span> Aplicar Filtro Ultra
                                                                    </button>
                                                                    <span className="text-[7px] text-neutral-600 mt-2">Gemini Ultra Engine</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <img src={opt.refinedUrl} alt="refined" onClick={() => handleMediaClick(opt.refinedUrl)} className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover/ref:scale-105" />
                                                                    <div className="absolute top-2 right-2 bg-indigo-600/90 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none shadow-[0_0_10px_rgba(79,70,229,0.5)]">Ultra HQ ✨</div>
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

            {/* Modal: Crear Filtro Personalizado */}
            {showCustomFilterModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-neutral-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
                        <button onClick={() => setShowCustomFilterModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors">✕</button>
                        
                        <h3 className="text-xl font-black text-white mb-1">Crea tu Filtro Estético</h3>
                        <p className="text-xs text-neutral-500 mb-6 font-light">Este filtro se guardará localmente. No necesitas llenar todo, solo lo que quieras forzar en la IA.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block mb-1">Nombre (Obligatorio)</label>
                                <input type="text" value={customFilterForm.label} onChange={e=>setCustomFilterForm({...customFilterForm, label: e.target.value})} placeholder="Ej: Mi Estilo Dark..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Lente / Cámara</label>
                                    <input type="text" value={customFilterForm.lens} onChange={e=>setCustomFilterForm({...customFilterForm, lens: e.target.value})} placeholder="Ej: 35mm film, f/1.4..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Iluminación</label>
                                    <input type="text" value={customFilterForm.lighting} onChange={e=>setCustomFilterForm({...customFilterForm, lighting: e.target.value})} placeholder="Ej: Cinematic studio, neon..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Grano / Textura</label>
                                    <input type="text" value={customFilterForm.grain} onChange={e=>setCustomFilterForm({...customFilterForm, grain: e.target.value})} placeholder="Ej: Heavy analogue grain..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Mood / Tono</label>
                                    <input type="text" value={customFilterForm.mood} onChange={e=>setCustomFilterForm({...customFilterForm, mood: e.target.value})} placeholder="Ej: Dark, gritty, warm..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Extras (Técnicas, calidades, etc)</label>
                                <input type="text" value={customFilterForm.extra} onChange={e=>setCustomFilterForm({...customFilterForm, extra: e.target.value})} placeholder="Ej: 8k resolution, award winning, masterpiece..." className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                            </div>
                        </div>

                        <button onClick={saveCustomFilter} className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                            Guardar y Aplicar Filtro
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
